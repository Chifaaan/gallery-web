"""
routers/explainability.py
Endpoint on-demand untuk analisis explainability model.

Endpoint ini HANYA dipanggil saat user membuka modal detail gambar,
BUKAN saat proses pencarian, sehingga tidak mengganggu performa search.
"""

import time
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Request

from models.schemas import (
    ExplainRequest,
    ExplainResponse,
    AttentionWeightItem,
    TokenContributionItem,
    EmbeddingAnalysis,
    EmbeddingDimensionItem,
    EmbeddingStatsItem,
)

router = APIRouter()


def get_engine(request: Request):
    return request.app.state.engine


@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="Analisis explainability untuk pasangan query-image (on-demand)",
    description=(
        "Mengembalikan data visualisasi yang menjelaskan MENGAPA model "
        "memberikan skor similarity tertentu untuk pasangan query-image. "
        "Endpoint ini dipanggil saat user membuka modal detail, "
        "bukan saat pencarian."
    ),
)
async def explain(
    body: ExplainRequest,
    engine=Depends(get_engine),
):
    # Validasi analyses
    valid_analyses = {"attention", "token_contribution", "embedding"}
    invalid = set(body.analyses) - valid_analyses
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Jenis analisis tidak valid: {invalid}. "
                   f"Pilihan: {valid_analyses}",
        )

    try:
        result = engine.get_explainability(
            query=body.query,
            image_id=body.image_id,
            analyses=body.analyses,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal menjalankan analisis explainability: {str(e)}",
        )

    # Convert dataclass result ke Pydantic response
    response_data: dict = {
        "metadata": {
            "query": body.query,
            "image_id": body.image_id,
            "analyses": body.analyses,
            "elapsed_ms": result.elapsed_ms,
        }
    }

    if result.attention_weights is not None:
        response_data["attention_weights"] = [
            AttentionWeightItem(
                token=aw.token,
                weight=aw.weight,
                is_special=aw.is_special,
            )
            for aw in result.attention_weights
        ]

    if result.token_contributions is not None:
        response_data["token_contributions"] = [
            TokenContributionItem(
                token=tc.token,
                contribution=tc.contribution,
                original_score=tc.original_score,
                perturbed_score=tc.perturbed_score,
            )
            for tc in result.token_contributions
        ]

    if result.embedding_dimensions is not None and result.embedding_stats is not None:
        response_data["embedding_analysis"] = EmbeddingAnalysis(
            dimensions=[
                EmbeddingDimensionItem(
                    dim_index=ed.dim_index,
                    text_value=ed.text_value,
                    image_value=ed.image_value,
                    contribution=ed.contribution,
                )
                for ed in result.embedding_dimensions
            ],
            stats=EmbeddingStatsItem(
                mean_contribution=result.embedding_stats.mean_contribution,
                std_contribution=result.embedding_stats.std_contribution,
                top_positive_dims=result.embedding_stats.top_positive_dims,
                top_negative_dims=result.embedding_stats.top_negative_dims,
                total_active_dims=result.embedding_stats.total_active_dims,
            ),
        )

    return ExplainResponse(**response_data)
