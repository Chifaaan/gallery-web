"""
core/explainability.py
Modul analisis explainability untuk memahami MENGAPA model memberikan hasil tertentu.

Tiga jenis analisis:
1. Attention Weights  — token mana yang paling diperhatikan CLIP text transformer
2. Token Contribution — kontribusi setiap token terhadap similarity (perturbation-based)
3. Embedding Dimension — dimensi embedding 512-dim mana yang paling aktif

CATATAN: Modul ini HANYA dipanggil on-demand saat user membuka modal detail,
BUKAN saat proses pencarian, sehingga tidak mengganggu performa search.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import torch
import torch.nn.functional as F


# ─── Lazy singleton untuk BPE token decoding ───
_bpe_tokenizer = None


def _get_bpe_tokenizer():
    """Lazy-load SimpleTokenizer untuk decoding token IDs ke string."""
    global _bpe_tokenizer
    if _bpe_tokenizer is None:
        from open_clip.tokenizer import SimpleTokenizer
        _bpe_tokenizer = SimpleTokenizer()
    return _bpe_tokenizer


def _decode_token_ids(token_ids: list[int], eot_idx: int) -> list[str]:
    """
    Decode list of CLIP BPE token IDs menjadi list of token strings.
    Hanya decode sampai eot_idx (inclusive).
    """
    bpe = _get_bpe_tokenizer()
    result = []
    for i, tid in enumerate(token_ids):
        if i > eot_idx:
            break
        if tid in bpe.decoder:
            result.append(bpe.decoder[tid])
        else:
            result.append(f"<{tid}>")
    return result


@dataclass
class AttentionToken:
    token: str
    weight: float
    is_special: bool = False


@dataclass
class TokenContrib:
    token: str
    contribution: float
    original_score: float
    perturbed_score: float


@dataclass
class EmbeddingDim:
    dim_index: int
    text_value: float
    image_value: float
    contribution: float


@dataclass
class EmbeddingStats:
    mean_contribution: float
    std_contribution: float
    top_positive_dims: int
    top_negative_dims: int
    total_active_dims: int  # dims dengan |contribution| > threshold


@dataclass
class ExplainResult:
    attention_weights: Optional[list[AttentionToken]] = None
    token_contributions: Optional[list[TokenContrib]] = None
    embedding_dimensions: Optional[list[EmbeddingDim]] = None
    embedding_stats: Optional[EmbeddingStats] = None
    elapsed_ms: float = 0.0


# ─── CLIP special token IDs ───
SOT_TOKEN = "<|startoftext|>"
EOT_TOKEN = "<|endoftext|>"
SPECIAL_TOKENS = {SOT_TOKEN, EOT_TOKEN}


class ExplainabilityAnalyzer:
    """
    Menganalisis pasangan (query_text, image_embedding) untuk menghasilkan
    visualisasi explainability. Stateless — menerima model & tokenizer
    dari SearchEngine.
    """

    def analyze(
        self,
        query_text: str,
        image_embedding: np.ndarray,       # [512] — satu baris dari image_index
        model,                              # open_clip CLIP model
        tokenizer,                          # open_clip tokenizer (callable)
        device: str,
        analyses: list[str] | None = None,  # subset of ["attention", "token_contribution", "embedding"]
    ) -> ExplainResult:
        """
        Jalankan analisis yang diminta. Default: semua 3 analisis.
        """
        if analyses is None:
            analyses = ["attention", "token_contribution", "embedding"]

        t0 = time.perf_counter()
        result = ExplainResult()

        # Tokenisasi query menggunakan CLIP tokenizer
        tokens = tokenizer(query_text).to(device)       # [1, 77]

        # Posisi EOT token (token dengan ID tertinggi = 49407)
        eot_idx = tokens[0].argmax().item()

        # Decode token strings untuk display
        token_ids_list = tokens[0].tolist()
        token_strings = _decode_token_ids(token_ids_list, eot_idx)

        # Image embedding sebagai tensor
        img_emb_t = torch.tensor(image_embedding, dtype=torch.float32).to(device)  # [512]
        if img_emb_t.dim() == 1:
            img_emb_t = img_emb_t.unsqueeze(0)  # [1, 512]

        # ── 1. Attention Weights ──
        if "attention" in analyses:
            result.attention_weights = self._analyze_attention(
                model, tokens, token_strings, eot_idx, device
            )

        # ── 2. Token Contribution (perturbation-based) ──
        if "token_contribution" in analyses:
            result.token_contributions = self._analyze_token_contribution(
                model, tokens, token_strings, img_emb_t, eot_idx, device,
            )

        # ── 3. Embedding Dimension Analysis ──
        if "embedding" in analyses:
            dims, stats = self._analyze_embedding_dimensions(
                model, tokens, img_emb_t
            )
            result.embedding_dimensions = dims
            result.embedding_stats = stats

        result.elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        return result

    # ─── Attention Weights ────────────────────────────────────────

    def _analyze_attention(
        self,
        model,
        tokens: torch.Tensor,        # [1, 77]
        token_strings: list[str],
        eot_idx: int,
        device: str,
    ) -> list[AttentionToken]:
        """
        Ekstrak attention weights dari CLIP text transformer layer terakhir.
        Rata-ratakan semua heads, ambil attention FROM EOT token TO setiap token.
        (EOT di CLIP setara dengan [CLS] di BERT — representasi utama teks.)
        """
        with torch.no_grad():
            # Manual forward pass melalui text encoder
            x = model.token_embedding(tokens).float()       # [1, 77, 512]
            x = x + model.positional_embedding[:x.shape[1]].float()
            x = x.permute(1, 0, 2)  # [77, 1, 512] — LND format

            # Attention mask (causal)
            attn_mask = model.attn_mask
            if attn_mask is not None:
                attn_mask = attn_mask[:x.shape[0], :x.shape[0]].to(device)

            # Forward melalui semua resblocks kecuali yang terakhir
            for block in model.transformer.resblocks[:-1]:
                x = block(x, attn_mask=attn_mask)

            # Last resblock: extract attention weights
            last_block = model.transformer.resblocks[-1]
            x_ln = last_block.ln_1(x)
            _, attn_weights = last_block.attn(
                x_ln, x_ln, x_ln,
                need_weights=True,
                attn_mask=attn_mask,
            )
            # attn_weights: [1, tgt_len, src_len] (averaged over heads)

        # Attention dari EOT ke semua token
        eot_attention = attn_weights[0, eot_idx, :].cpu().numpy()   # [seq_len]

        # Mask: hanya token sampai EOT (non-padding)
        mask = np.zeros(len(eot_attention))
        for i in range(eot_idx + 1):
            mask[i] = 1.0

        eot_attention = eot_attention * mask

        # Normalize
        total = eot_attention.sum()
        if total > 0:
            eot_attention = eot_attention / total

        return [
            AttentionToken(
                token=tok,
                weight=round(float(eot_attention[i]), 6),
                is_special=tok in SPECIAL_TOKENS,
            )
            for i, tok in enumerate(token_strings)
        ]

    # ─── Token Contribution (Perturbation) ────────────────────────

    def _analyze_token_contribution(
        self,
        model,
        tokens: torch.Tensor,        # [1, 77]
        token_strings: list[str],
        img_emb: torch.Tensor,       # [1, 512]
        eot_idx: int,
        device: str,
    ) -> list[TokenContrib]:
        """
        Perturbation-based: mask satu token pada satu waktu (ganti dengan padding 0),
        hitung ulang text embedding, bandingkan similarity.
        Kontribusi = original_score - perturbed_score.
        """
        # Original similarity
        with torch.no_grad():
            orig_emb = model.encode_text(tokens, normalize=True).float()
            orig_score = F.cosine_similarity(orig_emb, img_emb, dim=1).item()

        results = []

        for i, tok in enumerate(token_strings):
            if tok in SPECIAL_TOKENS:
                results.append(TokenContrib(
                    token=tok,
                    contribution=0.0,
                    original_score=round(orig_score, 6),
                    perturbed_score=round(orig_score, 6),
                ))
                continue

            # Mask token i dengan 0 (padding)
            perturbed = tokens.clone()
            perturbed[0, i] = 0

            with torch.no_grad():
                pert_emb = model.encode_text(perturbed, normalize=True).float()
                pert_score = F.cosine_similarity(pert_emb, img_emb, dim=1).item()

            contrib = orig_score - pert_score  # positif = token membantu

            results.append(TokenContrib(
                token=tok,
                contribution=round(contrib, 6),
                original_score=round(orig_score, 6),
                perturbed_score=round(pert_score, 6),
            ))

        return results

    # ─── Embedding Dimension Analysis ─────────────────────────────

    def _analyze_embedding_dimensions(
        self,
        model,
        tokens: torch.Tensor,        # [1, 77]
        img_emb: torch.Tensor,       # [1, 512]
        top_n: int = 30,
    ) -> tuple[list[EmbeddingDim], EmbeddingStats]:
        """
        Analisis element-wise contribution per dimensi embedding.
        contribution[d] = text_emb[d] * image_emb[d]
        (karena cosine similarity = dot product pada normalized vectors)
        """
        with torch.no_grad():
            text_emb = model.encode_text(tokens, normalize=True).float()  # [1, 512]

        text_np = text_emb[0].cpu().numpy()   # [512]
        img_np = img_emb[0].cpu().numpy()     # [512]

        # Element-wise contribution (dot product decomposition)
        contributions = text_np * img_np  # [512]

        # Statistik
        threshold = 0.005
        pos_count = int(np.sum(contributions > threshold))
        neg_count = int(np.sum(contributions < -threshold))
        active_count = pos_count + neg_count

        stats = EmbeddingStats(
            mean_contribution=round(float(np.mean(contributions)), 6),
            std_contribution=round(float(np.std(contributions)), 6),
            top_positive_dims=pos_count,
            top_negative_dims=neg_count,
            total_active_dims=active_count,
        )

        # Top-N dimensi berdasarkan magnitude
        top_indices = np.argsort(-np.abs(contributions))[:top_n]

        dims = [
            EmbeddingDim(
                dim_index=int(idx),
                text_value=round(float(text_np[idx]), 6),
                image_value=round(float(img_np[idx]), 6),
                contribution=round(float(contributions[idx]), 6),
            )
            for idx in top_indices
        ]

        return dims, stats
