"""
routers/feedback.py
Endpoints untuk menyimpan dan mengambil feedback pencarian pengguna.
"""

import math
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse

from models.schemas import (
    FeedbackRequest,
    FeedbackResponse,
    FeedbackStatsResponse,
    FeedbackListResponse,
    FeedbackItem,
)

router = APIRouter()


def get_feedback_db(request: Request):
    return request.app.state.feedback_db


# ─────────────────────────────────────────────────────────────
# POST /api/v1/feedback
# Body: { query_text, category, is_relevant, timestamp, ... }
# ─────────────────────────────────────────────────────────────
@router.post(
    "",
    response_model=FeedbackResponse,
    status_code=201,
    summary="Simpan feedback pencarian pengguna",
)
async def submit_feedback(body: FeedbackRequest, request: Request):
    db = get_feedback_db(request)
    try:
        feedback_id = await db.save_feedback(
            query_text    = body.query_text,
            category      = body.category,
            is_relevant   = body.is_relevant,
            timestamp     = body.timestamp,
            elapsed_ms    = body.elapsed_ms,
            top_k         = body.top_k,
            total_results = body.total_results,
        )
        return FeedbackResponse(
            id      = feedback_id,
            message = "Feedback berhasil disimpan",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan feedback: {str(e)}")


# ─────────────────────────────────────────────────────────────
# GET /api/v1/feedback?page=1&limit=20
# ─────────────────────────────────────────────────────────────
@router.get(
    "",
    response_model=FeedbackListResponse,
    summary="Ambil daftar feedback (paginated)",
)
async def list_feedback(
    page : int = 1,
    limit: int = 20,
    request: Request = None,  # type: ignore[assignment]
):
    db = get_feedback_db(request)
    items, total = await db.get_all(page=page, limit=limit)
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    return FeedbackListResponse(
        total       = total,
        page        = page,
        limit       = limit,
        total_pages = total_pages,
        items       = [FeedbackItem(**item) for item in items],
    )


# ─────────────────────────────────────────────────────────────
# GET /api/v1/feedback/stats
# ─────────────────────────────────────────────────────────────
@router.get(
    "/stats",
    response_model=FeedbackStatsResponse,
    summary="Statistik ringkasan feedback",
)
async def feedback_stats(request: Request):
    db = get_feedback_db(request)
    stats = await db.get_stats()
    return FeedbackStatsResponse(**stats)


# ─────────────────────────────────────────────────────────────
# GET /api/v1/feedback/export
# ─────────────────────────────────────────────────────────────
@router.get(
    "/export",
    response_class=PlainTextResponse,
    summary="Export feedback ke CSV",
)
async def export_feedback(request: Request):
    db = get_feedback_db(request)
    csv_content = await db.export_csv()
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=feedback_export.csv"},
    )
