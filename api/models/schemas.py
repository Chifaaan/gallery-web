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
    version    : str = "1.0.0"
    model      : str = "CLIP ViT-B/32 + IndoBERT"
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


# ─── Feedback ───

class FeedbackRequest(BaseModel):
    query_text   : str   = Field(..., description="Query pencarian pengguna")
    category     : str   = Field(..., description="Kategori: text, image, atau multimodal")
    is_relevant  : bool  = Field(..., description="Apakah hasil pencarian relevan")
    timestamp    : str   = Field(..., description="Waktu query dilakukan (ISO 8601)")
    elapsed_ms   : Optional[float] = Field(default=None, description="Waktu respons pencarian (ms)")
    top_k        : Optional[int]   = Field(default=None, description="Jumlah hasil yang diminta")
    total_results: Optional[int]   = Field(default=None, description="Jumlah hasil yang dikembalikan")

class FeedbackResponse(BaseModel):
    id      : int
    message : str

class FeedbackItem(BaseModel):
    id            : int
    query_text    : str
    category      : str
    is_relevant   : bool
    timestamp     : str
    elapsed_ms    : Optional[float] = None
    top_k         : Optional[int]   = None
    total_results : Optional[int]   = None
    created_at    : Optional[str]   = None

class FeedbackListResponse(BaseModel):
    total       : int
    page        : int
    limit       : int
    total_pages : int
    items       : list[FeedbackItem]

class CategoryStats(BaseModel):
    total    : int
    positive : int

class FeedbackStatsResponse(BaseModel):
    total         : int
    positive      : int
    negative      : int
    positive_rate : float
    by_category   : dict[str, CategoryStats]
