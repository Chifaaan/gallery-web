import io
import time
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from PIL import Image

from models.schemas import SearchResponse, TextSearchRequest

router = APIRouter()


def get_engine(request: Request):
    return request.app.state.engine



# POST /api/v1/search/text
@router.post(
    "/text",
    response_model=SearchResponse,
    summary="Cari gambar berdasarkan teks bahasa Indonesia",
)
async def search_by_text(
    body   : TextSearchRequest,
    engine = Depends(get_engine),
):
    t0 = time.perf_counter()
    results = engine.search_by_text(body.query, top_k=body.top_k)
    elapsed = (time.perf_counter() - t0) * 1000

    return SearchResponse(
        query_type = "text",
        query_text = body.query,
        total      = len(results),
        results    = results,
        elapsed_ms = round(elapsed, 2),
    )


# POST /api/v1/search/image
@router.post(
    "/image",
    response_model=SearchResponse,
    summary="Cari gambar serupa berdasarkan gambar query",
)
async def search_by_image(
    file   : UploadFile = File(..., description="Gambar query (JPG/PNG/WEBP)"),
    top_k  : int        = Form(default=10, ge=1, le=50),
    engine              = Depends(get_engine),
):
    _validate_image_file(file)
    pil_image = await _read_image(file)

    t0 = time.perf_counter()
    results = engine.search_by_image(pil_image, top_k=top_k)
    elapsed = (time.perf_counter() - t0) * 1000

    return SearchResponse(
        query_type = "image",
        query_text = None,
        total      = len(results),
        results    = results,
        elapsed_ms = round(elapsed, 2),
    )


# POST /api/v1/search/multimodal
@router.post(
    "/multimodal",
    response_model=SearchResponse,
    summary="Cari gambar dengan gabungan teks + gambar (multimodal)",
)
async def search_multimodal(
    query       : str        = Form(..., description="Query teks bahasa Indonesia"),
    file        : UploadFile = File(..., description="Gambar referensi"),
    text_weight : float      = Form(default=0.5, ge=0.0, le=1.0,
                                    description="Bobot teks (0=hanya gambar, 1=hanya teks)"),
    top_k       : int        = Form(default=10, ge=1, le=50),
    engine                   = Depends(get_engine),
):
    _validate_image_file(file)
    pil_image = await _read_image(file)

    t0 = time.perf_counter()
    results = engine.search_by_text_and_image(
        query, pil_image, text_weight=text_weight, top_k=top_k
    )
    elapsed = (time.perf_counter() - t0) * 1000

    return SearchResponse(
        query_type = "multimodal",
        query_text = query,
        total      = len(results),
        results    = results,
        elapsed_ms = round(elapsed, 2),
    )


# ─── Helpers ───
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 10

def _validate_image_file(file: UploadFile):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Tipe file tidak didukung: {file.content_type}. Gunakan JPG, PNG, atau WEBP.",
        )

async def _read_image(file: UploadFile) -> Image.Image:
    data = await file.read()
    if len(data) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Ukuran file maksimal {MAX_SIZE_MB}MB")
    try:
        return Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=422, detail="File gambar tidak valid atau corrupt")
