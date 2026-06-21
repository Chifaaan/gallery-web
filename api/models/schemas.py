"""
models/schemas.py
Pydantic schemas untuk request & response API
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ─── Search Results ───

class SearchResultItem(BaseModel):
    rank       : int
    score      : float = Field(..., description="Cosine similarity score (0-1)")
    image_id   : str
    url        : str   = Field(..., description="URL gambar (bisa diakses langsung)")
    captions_id: list[str] = []
    captions_en: list[str] = []
    filename   : str = ""

class SearchResponse(BaseModel):
    query_type : str  = Field(..., description="text | image | multimodal")
    query_text : Optional[str] = None
    total      : int
    results    : list[SearchResultItem]
    elapsed_ms : float


# ─── Text Search ───

class TextSearchRequest(BaseModel):
    query  : str  = Field(..., min_length=1, max_length=500,
                           description="Query teks bahasa Indonesia")
    top_k  : int  = Field(default=10, ge=1, le=50)


# ─── Multimodal Search ───
# (Image search & multimodal via multipart form — lihat router)


# ─── Index Management ───

class ImageMetaIn(BaseModel):
    captions_id: list[str] = Field(default=[], description="Caption bahasa Indonesia")
    captions_en: list[str] = Field(default=[], description="Caption bahasa Inggris (opsional)")

class AddImagesResponse(BaseModel):
    added      : int
    image_ids  : list[str]
    message    : str

class DeleteImageResponse(BaseModel):
    deleted    : bool
    image_id   : str
    message    : str

class IndexStatsResponse(BaseModel):
    total_images: int
    index_shape : list[int]
    device      : str
    model_loaded: bool


# ─── Health ───

class HealthResponse(BaseModel):
    status     : str
    version    : str = "3.0.0"
    model      : str = "CLIP + XLM-RoBERTa (MCLIP)"
    timestamp  : str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── Explainability ───

class ExplainRequest(BaseModel):
    query    : str = Field(..., min_length=1, max_length=500,
                           description="Query teks yang digunakan saat pencarian")
    image_id : str = Field(..., description="ID gambar yang ingin dianalisis")
    analyses : list[str] = Field(
        default=["attention", "token_contribution", "embedding"],
        description="Jenis analisis: attention, token_contribution, embedding",
    )

class AttentionWeightItem(BaseModel):
    token      : str
    weight     : float
    is_special : bool = False

class TokenContributionItem(BaseModel):
    token           : str
    contribution    : float
    original_score  : float
    perturbed_score : float

class EmbeddingDimensionItem(BaseModel):
    dim_index    : int
    text_value   : float
    image_value  : float
    contribution : float

class EmbeddingStatsItem(BaseModel):
    mean_contribution  : float
    std_contribution   : float
    top_positive_dims  : int
    top_negative_dims  : int
    total_active_dims  : int

class EmbeddingAnalysis(BaseModel):
    dimensions : list[EmbeddingDimensionItem]
    stats      : EmbeddingStatsItem

class ExplainResponse(BaseModel):
    attention_weights    : Optional[list[AttentionWeightItem]] = None
    token_contributions  : Optional[list[TokenContributionItem]] = None
    embedding_analysis   : Optional[EmbeddingAnalysis] = None
    metadata             : dict
