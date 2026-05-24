"""
core/engine.py
Wrapper utama untuk model CLIP Indonesia — load, encode, search, index management.
"""

import json
import os
import uuid
from pathlib import Path
from typing import Optional

from core.explainability import ExplainabilityAnalyzer, ExplainResult

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import AutoModel, AutoTokenizer
import open_clip
import torch.nn as nn


# ─── Arsitektur (harus identik dengan notebook training) ───

class ProjectionHead(nn.Module):
    def __init__(self, in_dim=768, out_dim=512, dropout=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, in_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(in_dim, out_dim),
            nn.LayerNorm(out_dim),
        )

    def forward(self, x):
        return self.net(x)


class IndoBERTTextEncoder(nn.Module):
    def __init__(self, model_name: str, embed_dim: int = 512):
        super().__init__()
        self.bert = AutoModel.from_pretrained(model_name)
        self.projection = ProjectionHead(
            in_dim=self.bert.config.hidden_size,
            out_dim=embed_dim,
        )

    def forward(self, input_ids, attention_mask):
        out = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        cls = out.last_hidden_state[:, 0, :]
        return F.normalize(self.projection(cls), dim=-1)


class CLIPIndonesianModel(nn.Module):
    def __init__(self, clip_model_name: str, clip_pretrained: str,
                 indobert_name: str, embed_dim: int = 512):
        super().__init__()
        clip_model, _, _ = open_clip.create_model_and_transforms(
            clip_model_name, pretrained=clip_pretrained
        )
        self.image_encoder = clip_model.visual
        for p in self.image_encoder.parameters():
            p.requires_grad = False
        self.image_encoder.eval()

        self.text_encoder = IndoBERTTextEncoder(indobert_name, embed_dim)
        self.logit_scale = nn.Parameter(torch.ones([]) * np.log(1 / 0.07))

    @torch.no_grad()
    def encode_image(self, images: torch.Tensor) -> torch.Tensor:
        self.image_encoder.eval()
        feats = self.image_encoder(images)
        if isinstance(feats, tuple):
            feats = feats[0]
        return F.normalize(feats.float(), dim=-1)

    @torch.no_grad()
    def encode_text(self, input_ids: torch.Tensor,
                    attention_mask: torch.Tensor) -> torch.Tensor:
        return self.text_encoder(input_ids, attention_mask)


# ─── Image transform (harus sama dengan training) ───
import torchvision.transforms as T

IMAGE_TRANSFORM = T.Compose([
    T.Resize(224, interpolation=T.InterpolationMode.BICUBIC),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(
        mean=(0.48145466, 0.4578275, 0.40821073),
        std=(0.26862954, 0.26130258, 0.27577711),
    ),
])


# ─── Search Engine ───

class SearchEngine:
    """
    Encapsulates the trained model and image index.
    Thread-safe untuk digunakan dalam FastAPI async context.
    """

    def __init__(self, export_dir: str, device: str = "auto"):
        self.export_dir = Path(export_dir)
        self.device = self._resolve_device(device)
        self.model: Optional[CLIPIndonesianModel] = None
        self.tokenizer = None
        self.image_index: Optional[np.ndarray] = None   # [N, 512]
        self.metadata: list[dict] = []                  # [{image_id, url, captions_id, ...}]
        self.index_path = Path("./storage/index.npy")
        self.metadata_path = Path("./storage/metadata.json")
        os.makedirs("./storage", exist_ok=True)

    def _resolve_device(self, device: str) -> str:
        if device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return device

    async def load(self):
        """Load model dan index. Dipanggil saat startup."""
        checkpoint = torch.load(
            self.export_dir / "indobert_text_encoder.pt",
            map_location=self.device,
        )
        cfg = checkpoint["config"]

        self.model = CLIPIndonesianModel(
            clip_model_name=cfg["clip_model"],
            clip_pretrained=cfg["clip_pretrained"],
            indobert_name=cfg["indobert_model"],
            embed_dim=cfg["embed_dim"],
        ).to(self.device)

        self.model.text_encoder.load_state_dict(checkpoint["model_state"])

        ls_ckpt = torch.load(self.export_dir / "logit_scale.pt", map_location=self.device)
        self.model.logit_scale.data = ls_ckpt["logit_scale"]

        self.model.eval()
        self.tokenizer = AutoTokenizer.from_pretrained(cfg["indobert_model"])

        # Load persisted index (atau fallback ke exported_model)
        self._load_index()

    def _load_index(self):
        """Load image index dan metadata dari storage."""
        if self.index_path.exists() and self.metadata_path.exists():
            self.image_index = np.load(str(self.index_path))
            with open(self.metadata_path, encoding="utf-8") as f:
                self.metadata = json.load(f)
            print(f"   Index loaded: {len(self.metadata)} images from storage")
        elif (self.export_dir / "image_index.npy").exists():
            # Fallback ke hasil export notebook
            self.image_index = np.load(str(self.export_dir / "image_index.npy"))
            meta_path = self.export_dir / "test_metadata.json"
            if meta_path.exists():
                with open(meta_path, encoding="utf-8") as f:
                    raw = json.load(f)
                # Tambahkan URL placeholder
                # Catatan: image_id dari Flickr8k sudah mengandung ekstensi
                # (misal "3578068665_87bdacef6a.jpg"), jadi JANGAN tambahkan .jpg lagi
                self.metadata = [
                    {**m, "url": f"/images/{m['image_id']}"}
                    for m in raw
                ]
            else:
                self.metadata = [
                    {"image_id": str(i), "url": "", "captions_id": []}
                    for i in range(len(self.image_index))
                ]
            self._persist_index()
            print(f"   Index loaded: {len(self.metadata)} images from export_dir")
        else:
            # Empty index — siap menerima gambar baru
            self.image_index = np.empty((0, 512), dtype=np.float32)
            self.metadata = []
            print("   Empty index initialized — ready for new images")

    def _persist_index(self):
        """Simpan index ke disk setelah setiap perubahan."""
        np.save(str(self.index_path), self.image_index)
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False)

    # ─── Encoding ───

    @torch.no_grad()
    def _encode_text(self, text: str) -> np.ndarray:
        tokens = self.tokenizer(
            text, return_tensors="pt",
            padding=True, truncation=True, max_length=64,
        ).to(self.device)
        emb = self.model.encode_text(tokens["input_ids"], tokens["attention_mask"])
        return emb.cpu().numpy()  # [1, 512]

    @torch.no_grad()
    def _encode_image(self, pil_image: Image.Image) -> np.ndarray:
        img_tensor = IMAGE_TRANSFORM(pil_image.convert("RGB")).unsqueeze(0).to(self.device)
        emb = self.model.encode_image(img_tensor)
        return emb.cpu().numpy()  # [1, 512]

    # ─── Search ───

    def search_by_text(self, query: str, top_k: int = 10) -> list[dict]:
        """Cari gambar berdasarkan teks bahasa Indonesia."""
        if len(self.metadata) == 0:
            return []
        query_emb = self._encode_text(query)     # [1, 512]
        return self._rank(query_emb, top_k)

    def search_by_image(self, pil_image: Image.Image, top_k: int = 10) -> list[dict]:
        """Cari gambar serupa berdasarkan gambar query."""
        if len(self.metadata) == 0:
            return []
        query_emb = self._encode_image(pil_image)  # [1, 512]
        return self._rank(query_emb, top_k)

    def search_by_text_and_image(
        self,
        text: str,
        pil_image: Image.Image,
        text_weight: float = 0.5,
        top_k: int = 10,
    ) -> list[dict]:
        """Pencarian multimodal: gabungkan embedding teks dan gambar."""
        if len(self.metadata) == 0:
            return []
        text_emb  = self._encode_text(text)
        image_emb = self._encode_image(pil_image)
        # Weighted average + re-normalize
        combined = text_weight * text_emb + (1 - text_weight) * image_emb
        norm = np.linalg.norm(combined, axis=1, keepdims=True)
        combined = combined / (norm + 1e-8)
        return self._rank(combined, top_k)

    def _rank(self, query_emb: np.ndarray, top_k: int) -> list[dict]:
        """Hitung similarity dan kembalikan top-k hasil."""
        sims = (self.image_index @ query_emb.T).squeeze()  # [N]
        if sims.ndim == 0:
            sims = sims.reshape(1)
        k = min(top_k, len(self.metadata))
        top_idx = np.argsort(-sims)[:k]

        return [
            {
                **self.metadata[int(idx)],
                "score": float(sims[int(idx)]),
                "rank": i + 1,
            }
            for i, idx in enumerate(top_idx)
        ]

    # ─── Index Management ───

    def add_images(self, images_with_meta: list[dict]) -> list[str]:
        """
        Tambahkan gambar baru ke index.
        images_with_meta: [{"pil_image": PIL.Image, "captions_id": [...], "url": str, ...}]
        Returns: list of assigned image_ids
        """
        new_embs = []
        new_meta = []
        assigned_ids = []

        for item in images_with_meta:
            pil_img = item["pil_image"]
            emb = self._encode_image(pil_img)   # [1, 512]
            new_embs.append(emb)

            image_id = str(uuid.uuid4())
            assigned_ids.append(image_id)
            new_meta.append({
                "image_id"   : image_id,
                "url"        : item.get("url", ""),
                "captions_id": item.get("captions_id", []),
                "captions_en": item.get("captions_en", []),
                "filename"   : item.get("filename", ""),
                "added_at"   : item.get("added_at", ""),
            })

        if new_embs:
            new_matrix = np.vstack(new_embs)       # [M, 512]
            if self.image_index.shape[0] == 0:
                self.image_index = new_matrix
            else:
                self.image_index = np.vstack([self.image_index, new_matrix])
            self.metadata.extend(new_meta)
            self._persist_index()

        return assigned_ids

    def delete_image(self, image_id: str) -> bool:
        """Hapus gambar dari index berdasarkan image_id."""
        idx = next((i for i, m in enumerate(self.metadata) if m["image_id"] == image_id), None)
        if idx is None:
            return False
        self.metadata.pop(idx)
        self.image_index = np.delete(self.image_index, idx, axis=0)
        self._persist_index()
        return True

    def get_stats(self) -> dict:
        return {
            "total_images": len(self.metadata),
            "index_shape" : list(self.image_index.shape),
            "device"      : self.device,
            "model_loaded": self.model is not None,
        }

    # ─── Explainability (on-demand, BUKAN saat search) ───

    def get_explainability(
        self,
        query: str,
        image_id: str,
        analyses: list[str] | None = None,
    ) -> ExplainResult:
        """
        Analisis explainability untuk pasangan query-image.
        Dipanggil HANYA saat user membuka modal detail, bukan saat pencarian.

        Args:
            query: teks query yang digunakan saat search
            image_id: ID gambar yang ingin dianalisis
            analyses: subset dari ["attention", "token_contribution", "embedding"]

        Returns:
            ExplainResult dengan data ketiga analisis
        """
        # Cari index gambar berdasarkan image_id
        idx = next(
            (i for i, m in enumerate(self.metadata) if m["image_id"] == image_id),
            None,
        )
        if idx is None:
            raise ValueError(f"Image ID tidak ditemukan: {image_id}")

        image_embedding = self.image_index[idx]  # [512]

        analyzer = ExplainabilityAnalyzer()
        return analyzer.analyze(
            query_text=query,
            image_embedding=image_embedding,
            model=self.model,
            tokenizer=self.tokenizer,
            device=self.device,
            analyses=analyses,
        )
