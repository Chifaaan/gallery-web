"""
core/engine.py
Wrapper utama untuk model MCLIP (CLIP + XLM-RoBERTa) — load, encode, search, index management.

Arsitektur MCLIP:
  - Text encoder:  XLM-RoBERTa-Large → linear_transform (1024→512) → adapter (norm+proj) → L2 normalize
  - Image encoder: CLIP ViT-B/32 (pretrained, tanpa fine-tuning)
  - Embedding space: 512-dim (shared antara text dan image)
"""

import asyncio
import json
import os
import uuid
from pathlib import Path
from typing import Optional

from core.explainability import ExplainabilityAnalyzer, ExplainResult

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
import open_clip
from transformers import XLMRobertaTokenizer, XLMRobertaModel


# ─── Image transform (harus sama dengan training CLIP ViT-B/32) ───
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


# ─── Adapter Module (harus sama persis dengan arsitektur training) ───

class MCLIPAdapter(nn.Module):
    """
    Adapter layer untuk fine-tuning: LayerNorm → Linear projection.
    Digunakan setelah linear_transform untuk menyempurnakan embedding.
    """
    def __init__(self, embed_dim: int = 512):
        super().__init__()
        self.norm = nn.LayerNorm(embed_dim)
        self.proj = nn.Linear(embed_dim, embed_dim, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.proj(self.norm(x))


# ─── Search Engine ───

class SearchEngine:
    """
    Encapsulates the trained MCLIP model (CLIP + XLM-RoBERTa) and image index.
    Thread-safe untuk digunakan dalam FastAPI async context.
    """

    def __init__(self, export_dir: str, device: str = "auto"):
        self.export_dir = Path(export_dir)
        self.device = self._resolve_device(device)

        # Model components
        self.clip_model = None                          # open_clip CLIP model (visual encoder only)
        self.xlmr_model: Optional[XLMRobertaModel] = None   # XLM-RoBERTa text encoder
        self.xlmr_tokenizer = None                      # XLM-RoBERTa tokenizer
        self.linear_transform = None                    # nn.Linear(1024, 512)
        self.adapter = None                             # MCLIPAdapter(512)
        self.logit_scale = None                         # learnable logit scale

        self.image_index: Optional[np.ndarray] = None   # [N, 512]
        self.metadata: list[dict] = []                  # [{image_id, url, captions_id, ...}]
        self.index_path = Path("./storage/index.npy")
        self.metadata_path = Path("./storage/metadata.json")
        self._lock = asyncio.Lock()                     # lock untuk operasi index concurrent
        os.makedirs("./storage", exist_ok=True)

    def _resolve_device(self, device: str) -> str:
        if device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return device

    def _load_sync(self):
        """
        Load model dan index secara synchronous.
        Dipanggil dari load() melalui asyncio.to_thread() agar tidak
        memblokir event loop FastAPI saat startup.
        """

        # 1. Load MCLIP text encoder checkpoint
        print("   Loading MCLIP text encoder checkpoint...")
        text_ckpt = torch.load(
            self.export_dir / "mclip_text_encoder.pt",
            map_location=self.device,
            weights_only=False,
        )
        cfg = text_ckpt["config"]
        model_state = text_ckpt["model_state"]

        print(f"   Config: mclip_model={cfg['mclip_model_name']}, "
              f"clip_model={cfg['clip_model']}, "
              f"embed_dim={cfg['embed_dim']}, xlmr_dim={cfg['xlmr_dim']}")

        # 2. Load XLM-RoBERTa tokenizer dan model architecture
        print("   Initializing XLM-RoBERTa tokenizer & model...")
        mclip_model_name = cfg["mclip_model_name"]
        self.xlmr_tokenizer = XLMRobertaTokenizer.from_pretrained(mclip_model_name)

        # Buat XLM-RoBERTa model architecture, lalu load finetuned weights
        self.xlmr_model = XLMRobertaModel.from_pretrained(mclip_model_name)

        # Extract XLM-RoBERTa weights dari checkpoint
        xlmr_state = {
            k.replace("transformer.", ""): v
            for k, v in model_state.items()
            if k.startswith("transformer.")
        }
        self.xlmr_model.load_state_dict(xlmr_state, strict=False)
        self.xlmr_model = self.xlmr_model.to(self.device)
        self.xlmr_model.eval()
        print(f"   XLM-RoBERTa loaded: {sum(p.numel() for p in self.xlmr_model.parameters()):,} params")

        # 3. Load linear_transform (1024 → 512)
        embed_dim = cfg["embed_dim"]      # 512
        xlmr_dim = cfg["xlmr_dim"]        # 1024

        self.linear_transform = nn.Linear(xlmr_dim, embed_dim, bias=False)
        self.linear_transform.weight.data = model_state["linear_transform.weight"].to(self.device)
        self.linear_transform = self.linear_transform.to(self.device)
        self.linear_transform.eval()

        # 4. Load adapter (LayerNorm + Linear projection)
        self.adapter = MCLIPAdapter(embed_dim)
        adapter_state = {
            k.replace("adapter.", ""): v
            for k, v in model_state.items()
            if k.startswith("adapter.")
        }
        self.adapter.load_state_dict(adapter_state)
        self.adapter = self.adapter.to(self.device)
        self.adapter.eval()

        # 5. Load logit_scale dari file terpisah
        logit_scale_ckpt = torch.load(
            self.export_dir / "logit_scale.pt",
            map_location=self.device,
            weights_only=False,
        )
        self.logit_scale = logit_scale_ckpt["logit_scale"].to(self.device)
        print(f"   Logit scale: {self.logit_scale.item():.4f}")

        # 6. Load CLIP ViT-B/32 image encoder (pretrained, tanpa fine-tuning)
        print("   Loading CLIP ViT-B/32 image encoder (pretrained)...")
        clip_model, _, _ = open_clip.create_model_and_transforms(
            cfg["clip_model"],
            pretrained=cfg["clip_pretrained"],
        )
        clip_model = clip_model.to(self.device)
        clip_model.eval()
        self.clip_model = clip_model

        # Simpan config untuk referensi
        self.model_config = cfg

        # 7. Load persisted index (atau fallback ke exported_model)
        self._load_index()

        # Bebaskan memori checkpoint
        del text_ckpt, model_state, xlmr_state, logit_scale_ckpt
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        print("   ✅ MCLIP model fully loaded!")

    # Property untuk backward compatibility (digunakan di health check dll)
    @property
    def model(self):
        """Backward compatibility: returns non-None jika semua komponen loaded."""
        if self.xlmr_model is not None and self.clip_model is not None:
            return self.clip_model  # return sesuatu non-None
        return None

    @property
    def tokenizer(self):
        """Backward compatibility: returns XLM-RoBERTa tokenizer."""
        return self.xlmr_tokenizer

    async def load(self):
        """
        Load model dan index. Dipanggil saat startup.
        Menjalankan _load_sync() di thread executor agar tidak memblokir
        event loop FastAPI.

        Contoh penggunaan di main.py:
            @app.on_event("startup")
            async def startup():
                await engine.load()
        """
        await asyncio.to_thread(self._load_sync)

    def _load_index(self):
        """Load image index dan metadata dari storage."""
        if self.index_path.exists() and self.metadata_path.exists():
            self.image_index = np.load(str(self.index_path))
            with open(self.metadata_path, encoding="utf-8") as f:
                self.metadata = json.load(f)
            print(f"   Index loaded: {len(self.metadata)} images from storage")

        elif (self.export_dir / "image_index.npy").exists():
            # Fallback ke hasil export notebook
            raw_index = np.load(str(self.export_dir / "image_index.npy"))
            meta_path = self.export_dir / "test_metadata.json"

            if meta_path.exists():
                with open(meta_path, encoding="utf-8") as f:
                    raw = json.load(f)

                # Deduplikasi image_index jika jumlah row != jumlah gambar unik.
                # image_index.npy dari notebook di-expand per caption (N_records),
                # sedangkan test_metadata.json per gambar unik (N_images).
                if raw_index.shape[0] != len(raw):
                    print(
                        f"   [INFO] Mismatch terdeteksi: {raw_index.shape[0]} records "
                        f"vs {len(raw)} gambar unik — melakukan deduplikasi index..."
                    )
                    captions_per_image = [
                        max(len(m.get("captions_id", [])), 1) for m in raw
                    ]
                    unique_embs = []
                    cursor = 0
                    for n_cap in captions_per_image:
                        unique_embs.append(raw_index[cursor])
                        cursor += n_cap
                    raw_index = np.vstack(unique_embs)
                    print(f"   [INFO] image_index setelah deduplikasi: {raw_index.shape}")

                self.image_index = raw_index

                # Catatan: image_id dari Flickr sudah mengandung ekstensi
                # (misal "3578068665_87bdacef6a.jpg"), jadi JANGAN tambahkan .jpg lagi
                self.metadata = [
                    {**m, "url": f"/images/{m['image_id']}"}
                    for m in raw
                ]
            else:
                self.image_index = raw_index
                self.metadata = [
                    {"image_id": str(i), "url": "", "captions_id": []}
                    for i in range(len(raw_index))
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
        """
        Encode teks menggunakan pipeline MCLIP:
        Text → XLM-RoBERTa Tokenizer → XLM-RoBERTa Encoder → [CLS]
          → linear_transform (1024→512) → adapter (norm+proj) → L2 normalize
        """
        # Tokenisasi dengan XLM-RoBERTa tokenizer
        inputs = self.xlmr_tokenizer(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=self.model_config.get("max_text_length", 77),
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Forward pass melalui XLM-RoBERTa
        outputs = self.xlmr_model(**inputs)

        # Ambil [CLS] token embedding (posisi 0)
        cls_emb = outputs.last_hidden_state[:, 0, :]       # [1, 1024]

        # Projection: 1024 → 512
        projected = self.linear_transform(cls_emb)          # [1, 512]

        # Adapter: LayerNorm → Linear
        adapted = self.adapter(projected)                   # [1, 512]

        # L2 normalize
        emb = F.normalize(adapted.float(), dim=-1)          # [1, 512]

        return emb.cpu().numpy()                            # [1, 512]

    @torch.no_grad()
    def _encode_image(self, pil_image: Image.Image) -> np.ndarray:
        """
        Encode gambar menggunakan CLIP ViT-B/32 visual encoder.
        Pipeline sama dengan CLIP Vanilla — hanya visual encoder yang digunakan.
        """
        img_tensor = IMAGE_TRANSFORM(pil_image.convert("RGB")).unsqueeze(0).to(self.device)
        emb = self.clip_model.encode_image(img_tensor)
        emb = F.normalize(emb.float(), dim=-1)              # L2 normalize
        return emb.cpu().numpy()                            # [1, 512]

    # ─── Search ───

    def search_by_text(self, query: str, top_k: int = 10) -> list[dict]:
        """Cari gambar berdasarkan teks."""
        if len(self.metadata) == 0:
            return []
        query_emb = self._encode_text(query)    # [1, 512]
        return self._rank(query_emb, top_k)

    def search_by_image(self, pil_image: Image.Image, top_k: int = 10) -> list[dict]:
        """Cari gambar serupa berdasarkan gambar query."""
        if len(self.metadata) == 0:
            return []
        query_emb = self._encode_image(pil_image)   # [1, 512]
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

        Catatan: fitur ini belum digunakan. Lock asyncio (_lock) sudah
        disiapkan di __init__ apabila fitur ini diaktifkan di masa mendatang
        untuk mencegah race condition pada concurrent request.
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
            new_matrix = np.vstack(new_embs)        # [M, 512]
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

        image_embedding = self.image_index[idx]     # [512]

        analyzer = ExplainabilityAnalyzer()
        return analyzer.analyze(
            query_text=query,
            image_embedding=image_embedding,
            xlmr_model=self.xlmr_model,
            xlmr_tokenizer=self.xlmr_tokenizer,
            linear_transform=self.linear_transform,
            adapter=self.adapter,
            device=self.device,
            analyses=analyses,
            max_text_length=self.model_config.get("max_text_length", 77),
        )