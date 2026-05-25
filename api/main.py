"""
CLIP Indonesia Search API
FastAPI server untuk pencarian gambar berbasis CLIP Vanilla (Fine-tuned)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from core.engine import SearchEngine
from core.feedback_db import FeedbackDB
from routers import search, index_management, health, explainability, feedback


# ─── Lifespan: load model saat startup, cleanup saat shutdown ───
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting CLIP Indonesia Search API...")
    app.state.engine = SearchEngine(
        export_dir=os.getenv("MODEL_DIR", "./exported_model"),
        device=os.getenv("DEVICE", "auto"),
    )
    await app.state.engine.load()
    print("✅ Model loaded and ready!")

    # Inisialisasi Feedback DB
    app.state.feedback_db = FeedbackDB()
    await app.state.feedback_db.init()

    yield
    print("👋 Shutting down...")


# ─── App ───
app = FastAPI(
    title="CLIP Indonesia Search API",
    description="API pencarian gambar menggunakan CLIP ViT-B/32 Vanilla (Fine-tuned)",
    version="2.0.0",
    lifespan=lifespan,
)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static files untuk gambar yang di-upload ───
os.makedirs("./storage/images", exist_ok=True)
app.mount("/images", StaticFiles(directory="./storage/images"), name="images")

# ─── Routers ───
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(search.router, prefix="/api/v1/search", tags=["Search"])
app.include_router(index_management.router, prefix="/api/v1/index", tags=["Index Management"])
app.include_router(explainability.router, prefix="/api/v1", tags=["Explainability"])
app.include_router(feedback.router, prefix="/api/v1/feedback", tags=["Feedback"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENV", "development") == "development",
        workers=1,  # Hanya 1 worker karena model di-load sekali
    )
