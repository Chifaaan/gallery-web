import io
import os
import shutil
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from PIL import Image

from models.schemas import AddImagesResponse, DeleteImageResponse, IndexStatsResponse

router = APIRouter()


def get_engine(request: Request):
    return request.app.state.engine


# POST /api/v1/index/add
@router.post(
    "/add",
    response_model=AddImagesResponse,
    summary="Tambahkan gambar baru ke search index",
)
async def add_images(
    files      : List[UploadFile] = File(..., description="Satu atau lebih file gambar"),
    captions_id: List[str]        = Form(default=[],
                                         description="Caption ID per gambar (bisa kosong)"),
    captions_en: List[str]        = Form(default=[],
                                         description="Caption EN per gambar (bisa kosong)"),
    engine                         = Depends(get_engine),
):
    if len(files) == 0:
        raise HTTPException(status_code=422, detail="Minimal satu file harus dikirim")
    if len(files) > 50:
        raise HTTPException(status_code=422, detail="Maksimal 50 gambar per request")

    STORAGE_DIR = "./storage/images"
    os.makedirs(STORAGE_DIR, exist_ok=True)

    items_to_index = []
    saved_filenames = []

    for i, file in enumerate(files):
        if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(
                status_code=422,
                detail=f"File #{i+1}: tipe tidak didukung ({file.content_type})",
            )

        data = await file.read()
        if len(data) > 20 * 1024 * 1024:  # 20 MB max per file
            raise HTTPException(status_code=413, detail=f"File #{i+1} melebihi 20MB")

        try:
            pil_img = Image.open(io.BytesIO(data)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=422, detail=f"File #{i+1} bukan gambar valid")

        # Simpan ke storage dengan nama unik
        ext = _ext_from_content_type(file.content_type)
        filename = f"{uuid.uuid4().hex}{ext}"
        save_path = os.path.join(STORAGE_DIR, filename)
        with open(save_path, "wb") as f_out:
            f_out.write(data)

        saved_filenames.append(filename)

        # Ambil captions jika ada
        cap_id = _parse_caption(captions_id, i)
        cap_en = _parse_caption(captions_en, i)

        items_to_index.append({
            "pil_image"  : pil_img,
            "url"        : f"/images/{filename}",
            "filename"   : file.filename or filename,
            "captions_id": cap_id,
            "captions_en": cap_en,
            "added_at"   : datetime.utcnow().isoformat(),
        })

    # Tambahkan ke index
    assigned_ids = engine.add_images(items_to_index)

    return AddImagesResponse(
        added     = len(assigned_ids),
        image_ids = assigned_ids,
        message   = f"{len(assigned_ids)} gambar berhasil ditambahkan ke index",
    )


# DELETE /api/v1/index/{image_id}
@router.delete(
    "/{image_id}",
    response_model=DeleteImageResponse,
    summary="Hapus gambar dari index berdasarkan image_id",
)
async def delete_image(
    image_id: str,
    engine   = Depends(get_engine),
):
    # Cari metadata sebelum dihapus (untuk hapus file fisik)
    meta = next((m for m in engine.metadata if m["image_id"] == image_id), None)

    deleted = engine.delete_image(image_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"image_id '{image_id}' tidak ditemukan")

    # Hapus file fisik dari storage jika ada
    if meta and meta.get("url", "").startswith("/images/"):
        file_path = "./storage" + meta["url"]
        if os.path.exists(file_path):
            os.remove(file_path)

    return DeleteImageResponse(
        deleted  = True,
        image_id = image_id,
        message  = "Gambar berhasil dihapus dari index",
    )


# GET /api/v1/index/stats
@router.get(
    "/stats",
    response_model=IndexStatsResponse,
    summary="Statistik index (jumlah gambar, shape, device)",
)
async def get_stats(engine = Depends(get_engine)):
    return engine.get_stats()


@router.get(
    "/list",
    summary="Daftar semua gambar dalam index (paginated)",
)
async def list_images(
    page   : int = 1,
    limit  : int = 20,
    engine      = Depends(get_engine),
):
    limit = min(limit, 100)
    offset = (page - 1) * limit
    total  = len(engine.metadata)
    items  = engine.metadata[offset:offset + limit]

    return {
        "total"     : total,
        "page"      : page,
        "limit"     : limit,
        "total_pages": (total + limit - 1) // limit,
        "items"     : items,
    }


# ─── Helpers ───
def _ext_from_content_type(ct: str) -> str:
    return {
        "image/jpeg" : ".jpg",
        "image/png"  : ".png",
        "image/webp" : ".webp",
    }.get(ct, ".jpg")

def _parse_caption(captions_list: list[str], idx: int) -> list[str]:
    """Ambil caption ke-idx; bisa berupa string biasa atau JSON array."""
    if not captions_list or idx >= len(captions_list):
        return []
    raw = captions_list[idx]
    import json
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else [parsed]
    except Exception:
        return [raw] if raw.strip() else []
