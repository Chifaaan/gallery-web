"""
core/explainability.py
Modul analisis explainability untuk memahami MENGAPA model MCLIP memberikan hasil tertentu.

Tiga jenis analisis:
1. Attention Weights  — token mana yang paling diperhatikan XLM-RoBERTa text encoder
2. Token Contribution — kontribusi setiap token terhadap similarity (perturbation-based)
3. Embedding Dimension — dimensi embedding 512-dim mana yang paling aktif

CATATAN: Modul ini HANYA dipanggil on-demand saat user membuka modal detail,
BUKAN saat proses pencarian, sehingga tidak mengganggu performa search.

Arsitektur MCLIP text encoding pipeline:
  Text → XLM-RoBERTa Tokenizer → XLM-RoBERTa Encoder → [CLS] (1024-dim)
    → linear_transform (1024→512) → adapter.norm → adapter.proj → L2 normalize
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


# ─── XLM-RoBERTa special tokens ───
SOT_TOKEN = "<s>"
EOT_TOKEN = "</s>"
PAD_TOKEN = "<pad>"
SPECIAL_TOKENS = {SOT_TOKEN, EOT_TOKEN, PAD_TOKEN}


def _encode_text_mclip(
    text: str,
    xlmr_model,
    xlmr_tokenizer,
    linear_transform,
    adapter,
    device: str,
    max_text_length: int = 77,
) -> torch.Tensor:
    """
    Helper: encode teks melalui pipeline MCLIP lengkap.
    Returns: normalized embedding tensor [1, 512] di device.
    """
    inputs = xlmr_tokenizer(
        text,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=max_text_length,
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}

    outputs = xlmr_model(**inputs)
    cls_emb = outputs.last_hidden_state[:, 0, :]    # [1, 1024]
    projected = linear_transform(cls_emb)            # [1, 512]
    adapted = adapter(projected)                     # [1, 512]
    return F.normalize(adapted.float(), dim=-1)      # [1, 512]


def _encode_tokens_mclip(
    input_ids: torch.Tensor,
    attention_mask: torch.Tensor,
    xlmr_model,
    linear_transform,
    adapter,
) -> torch.Tensor:
    """
    Helper: encode pre-tokenized input melalui pipeline MCLIP lengkap.
    Digunakan untuk perturbation analysis.
    Returns: normalized embedding tensor [1, 512] di device.
    """
    outputs = xlmr_model(input_ids=input_ids, attention_mask=attention_mask)
    cls_emb = outputs.last_hidden_state[:, 0, :]    # [1, 1024]
    projected = linear_transform(cls_emb)            # [1, 512]
    adapted = adapter(projected)                     # [1, 512]
    return F.normalize(adapted.float(), dim=-1)      # [1, 512]


class ExplainabilityAnalyzer:
    """
    Menganalisis pasangan (query_text, image_embedding) untuk menghasilkan
    visualisasi explainability. Stateless — menerima model components
    dari SearchEngine.
    """

    def analyze(
        self,
        query_text: str,
        image_embedding: np.ndarray,           # [512] — satu baris dari image_index
        xlmr_model,                            # XLMRobertaModel
        xlmr_tokenizer,                        # XLMRobertaTokenizer
        linear_transform,                      # nn.Linear(1024, 512)
        adapter,                               # MCLIPAdapter
        device: str,
        analyses: list[str] | None = None,     # subset of ["attention", "token_contribution", "embedding"]
        max_text_length: int = 77,
    ) -> ExplainResult:
        """
        Jalankan analisis yang diminta. Default: semua 3 analisis.
        """
        if analyses is None:
            analyses = ["attention", "token_contribution", "embedding"]

        t0 = time.perf_counter()
        result = ExplainResult()

        # Tokenisasi query menggunakan XLM-RoBERTa tokenizer
        inputs = xlmr_tokenizer(
            query_text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=max_text_length,
        )
        input_ids = inputs["input_ids"].to(device)          # [1, seq_len]
        attention_mask = inputs["attention_mask"].to(device) # [1, seq_len]

        # Decode token strings untuk display
        token_ids_list = input_ids[0].tolist()
        token_strings = xlmr_tokenizer.convert_ids_to_tokens(token_ids_list)

        # Temukan posisi token non-padding terakhir
        seq_len = attention_mask[0].sum().item()

        # Image embedding sebagai tensor
        img_emb_t = torch.tensor(image_embedding, dtype=torch.float32).to(device)  # [512]
        if img_emb_t.dim() == 1:
            img_emb_t = img_emb_t.unsqueeze(0)  # [1, 512]

        # ── 1. Attention Weights ──
        if "attention" in analyses:
            result.attention_weights = self._analyze_attention(
                xlmr_model, input_ids, attention_mask,
                token_strings, seq_len, device
            )

        # ── 2. Token Contribution (perturbation-based) ──
        if "token_contribution" in analyses:
            result.token_contributions = self._analyze_token_contribution(
                xlmr_model, linear_transform, adapter,
                input_ids, attention_mask,
                token_strings, img_emb_t, seq_len, device,
            )

        # ── 3. Embedding Dimension Analysis ──
        if "embedding" in analyses:
            dims, stats = self._analyze_embedding_dimensions(
                xlmr_model, linear_transform, adapter,
                input_ids, attention_mask, img_emb_t,
            )
            result.embedding_dimensions = dims
            result.embedding_stats = stats

        result.elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        return result

    # ─── Attention Weights ────────────────────────────────────────

    def _analyze_attention(
        self,
        xlmr_model,
        input_ids: torch.Tensor,         # [1, seq_len]
        attention_mask: torch.Tensor,     # [1, seq_len]
        token_strings: list[str],
        seq_len: int,
        device: str,
    ) -> list[AttentionToken]:
        """
        Ekstrak attention weights dari XLM-RoBERTa layer terakhir.
        Rata-ratakan semua heads, ambil attention FROM [CLS] token (posisi 0) TO setiap token.
        ([CLS] di XLM-RoBERTa adalah representasi utama teks, analog EOT di CLIP.)
        """
        with torch.no_grad():
            outputs = xlmr_model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                output_attentions=True,
            )

        # Ambil attention dari layer terakhir
        # attentions[-1] shape: [batch, num_heads, seq_len, seq_len]
        last_layer_attn = outputs.attentions[-1]          # [1, 16, seq_len, seq_len]

        # Rata-rata semua heads
        avg_attn = last_layer_attn[0].mean(dim=0)         # [seq_len, seq_len]

        # Attention dari [CLS] (posisi 0) ke semua token
        cls_attention = avg_attn[0, :].cpu().numpy()      # [seq_len]

        # Mask: hanya token non-padding
        mask = attention_mask[0].cpu().numpy().astype(float)
        cls_attention = cls_attention * mask

        # Normalize
        total = cls_attention.sum()
        if total > 0:
            cls_attention = cls_attention / total

        return [
            AttentionToken(
                token=tok,
                weight=round(float(cls_attention[i]), 6),
                is_special=tok in SPECIAL_TOKENS,
            )
            for i, tok in enumerate(token_strings)
            if i < seq_len  # Hanya token non-padding
        ]

    # ─── Token Contribution (Perturbation) ────────────────────────

    def _analyze_token_contribution(
        self,
        xlmr_model,
        linear_transform,
        adapter,
        input_ids: torch.Tensor,         # [1, seq_len]
        attention_mask: torch.Tensor,     # [1, seq_len]
        token_strings: list[str],
        img_emb: torch.Tensor,           # [1, 512]
        seq_len: int,
        device: str,
    ) -> list[TokenContrib]:
        """
        Perturbation-based: mask satu token pada satu waktu
        (ganti dengan padding token ID), hitung ulang text embedding via
        MCLIP pipeline, bandingkan similarity.
        Kontribusi = original_score - perturbed_score.
        """
        # Original similarity
        with torch.no_grad():
            orig_emb = _encode_tokens_mclip(
                input_ids, attention_mask,
                xlmr_model, linear_transform, adapter,
            )
            orig_score = F.cosine_similarity(orig_emb, img_emb, dim=1).item()

        # Pad token ID untuk masking
        pad_token_id = 1  # XLM-RoBERTa pad token ID

        results = []

        for i in range(seq_len):
            tok = token_strings[i]

            if tok in SPECIAL_TOKENS:
                results.append(TokenContrib(
                    token=tok,
                    contribution=0.0,
                    original_score=round(orig_score, 6),
                    perturbed_score=round(orig_score, 6),
                ))
                continue

            # Mask token i dengan pad token
            perturbed_ids = input_ids.clone()
            perturbed_ids[0, i] = pad_token_id

            # Juga update attention mask untuk masked token
            perturbed_mask = attention_mask.clone()
            perturbed_mask[0, i] = 0

            with torch.no_grad():
                pert_emb = _encode_tokens_mclip(
                    perturbed_ids, perturbed_mask,
                    xlmr_model, linear_transform, adapter,
                )
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
        xlmr_model,
        linear_transform,
        adapter,
        input_ids: torch.Tensor,         # [1, seq_len]
        attention_mask: torch.Tensor,     # [1, seq_len]
        img_emb: torch.Tensor,           # [1, 512]
        top_n: int = 30,
    ) -> tuple[list[EmbeddingDim], EmbeddingStats]:
        """
        Analisis element-wise contribution per dimensi embedding.
        contribution[d] = text_emb[d] * image_emb[d]
        (karena cosine similarity = dot product pada normalized vectors)
        """
        with torch.no_grad():
            text_emb = _encode_tokens_mclip(
                input_ids, attention_mask,
                xlmr_model, linear_transform, adapter,
            )  # [1, 512]

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
