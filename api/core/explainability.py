"""
core/explainability.py
Modul analisis explainability untuk memahami MENGAPA model memberikan hasil tertentu.

Tiga jenis analisis:
1. Attention Weights  — token mana yang paling diperhatikan IndoBERT
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
        model,                              # CLIPIndonesianModel
        tokenizer,
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

        # Tokenisasi query
        tokens_out = tokenizer(
            query_text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=64,
        )
        input_ids = tokens_out["input_ids"].to(device)          # [1, seq_len]
        attention_mask = tokens_out["attention_mask"].to(device) # [1, seq_len]

        # Decode token strings untuk display
        token_ids_list = input_ids[0].tolist()
        token_strings = tokenizer.convert_ids_to_tokens(token_ids_list)

        # Image embedding sebagai tensor
        img_emb_t = torch.tensor(image_embedding, dtype=torch.float32).to(device)  # [512]
        if img_emb_t.dim() == 1:
            img_emb_t = img_emb_t.unsqueeze(0)  # [1, 512]

        # ── 1. Attention Weights ──
        if "attention" in analyses:
            result.attention_weights = self._analyze_attention(
                model, input_ids, attention_mask, token_strings
            )

        # ── 2. Token Contribution (perturbation-based) ──
        if "token_contribution" in analyses:
            result.token_contributions = self._analyze_token_contribution(
                model, tokenizer, input_ids, attention_mask,
                token_strings, img_emb_t, device,
            )

        # ── 3. Embedding Dimension Analysis ──
        if "embedding" in analyses:
            dims, stats = self._analyze_embedding_dimensions(
                model, input_ids, attention_mask, img_emb_t
            )
            result.embedding_dimensions = dims
            result.embedding_stats = stats

        result.elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        return result

    # ─── Attention Weights ────────────────────────────────────────

    def _analyze_attention(
        self,
        model,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        token_strings: list[str],
    ) -> list[AttentionToken]:
        """
        Ekstrak attention weights dari IndoBERT layer terakhir.
        Rata-ratakan semua heads, ambil attention FROM [CLS] token TO setiap token lain.
        """
        with torch.no_grad():
            bert_out = model.text_encoder.bert(
                input_ids=input_ids,
                attention_mask=attention_mask,
                output_attentions=True,
            )

        # attentions: tuple of [1, num_heads, seq_len, seq_len] per layer
        last_layer_attn = bert_out.attentions[-1]           # [1, H, S, S]
        avg_heads = last_layer_attn.mean(dim=1)             # [1, S, S]
        cls_attention = avg_heads[0, 0, :]                  # [S] — attention dari CLS ke semua token

        # Mask padding
        mask = attention_mask[0].float()
        cls_attention = cls_attention * mask

        # Normalize
        total = cls_attention.sum()
        if total > 0:
            cls_attention = cls_attention / total

        weights = cls_attention.cpu().numpy()

        special_tokens = {"[CLS]", "[SEP]", "[PAD]", "<s>", "</s>", "<pad>"}

        return [
            AttentionToken(
                token=tok,
                weight=round(float(weights[i]), 6),
                is_special=tok in special_tokens,
            )
            for i, tok in enumerate(token_strings)
            if mask[i].item() > 0  # skip padding
        ]

    # ─── Token Contribution (Perturbation) ────────────────────────

    def _analyze_token_contribution(
        self,
        model,
        tokenizer,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        token_strings: list[str],
        img_emb: torch.Tensor,       # [1, 512]
        device: str,
    ) -> list[TokenContrib]:
        """
        Perturbation-based: mask satu token pada satu waktu,
        hitung ulang text embedding, bandingkan similarity.
        Kontribusi = original_score - perturbed_score.
        """
        special_tokens = {"[CLS]", "[SEP]", "[PAD]", "<s>", "</s>", "<pad>"}

        # Original similarity
        with torch.no_grad():
            orig_emb = model.encode_text(input_ids, attention_mask)   # [1, 512]
            orig_score = F.cosine_similarity(orig_emb, img_emb, dim=1).item()

        seq_len = input_ids.shape[1]
        mask_token_id = tokenizer.mask_token_id or tokenizer.unk_token_id

        results = []
        actual_mask = attention_mask[0].cpu().tolist()

        for i in range(seq_len):
            tok = token_strings[i]
            if actual_mask[i] == 0:  # skip padding
                continue

            if tok in special_tokens:
                results.append(TokenContrib(
                    token=tok,
                    contribution=0.0,
                    original_score=round(orig_score, 6),
                    perturbed_score=round(orig_score, 6),
                ))
                continue

            # Mask token i
            perturbed_ids = input_ids.clone()
            perturbed_ids[0, i] = mask_token_id

            with torch.no_grad():
                pert_emb = model.encode_text(perturbed_ids, attention_mask)
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
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        img_emb: torch.Tensor,       # [1, 512]
        top_n: int = 30,
    ) -> tuple[list[EmbeddingDim], EmbeddingStats]:
        """
        Analisis element-wise contribution per dimensi embedding.
        contribution[d] = text_emb[d] * image_emb[d]
        (karena cosine similarity = dot product pada normalized vectors)
        """
        with torch.no_grad():
            text_emb = model.encode_text(input_ids, attention_mask)  # [1, 512]

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
