"""
Verification script: test MCLIP model loading, encoding, and search pipeline.
Validates that the API engine works correctly with the new MCLIP architecture.
"""

import sys
import os
import time
import numpy as np

# Ensure we're in the api directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 70)
print("MCLIP Engine Verification Script")
print("=" * 70)

# ── Step 1: Test imports ──
print("\n[1/6] Testing imports...")
try:
    import torch
    import torch.nn.functional as F
    from transformers import XLMRobertaTokenizer, XLMRobertaModel
    import open_clip
    print("   ✅ All imports successful")
    print(f"   PyTorch: {torch.__version__}")
    print(f"   Device: {'cuda' if torch.cuda.is_available() else 'cpu'}")
except ImportError as e:
    print(f"   ❌ Import error: {e}")
    sys.exit(1)

# ── Step 2: Test engine instantiation ──
print("\n[2/6] Testing SearchEngine instantiation...")
try:
    from core.engine import SearchEngine
    engine = SearchEngine(
        export_dir="./exported_model_mclip",
        device="cpu",  # Force CPU for testing
    )
    print("   ✅ SearchEngine created successfully")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

# ── Step 3: Test model loading ──
print("\n[3/6] Testing model loading (this may take a while)...")
t0 = time.time()
try:
    engine._load_sync()
    elapsed = time.time() - t0
    print(f"   ✅ Model loaded in {elapsed:.1f}s")
    print(f"   XLM-RoBERTa loaded: {engine.xlmr_model is not None}")
    print(f"   CLIP visual encoder: {engine.clip_model is not None}")
    print(f"   Linear transform: {engine.linear_transform is not None}")
    print(f"   Adapter: {engine.adapter is not None}")
    print(f"   Logit scale: {engine.logit_scale}")
    print(f"   Index shape: {engine.image_index.shape}")
    print(f"   Metadata count: {len(engine.metadata)}")
    print(f"   model property (backward compat): {engine.model is not None}")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

# ── Step 4: Test text encoding ──
print("\n[4/6] Testing text encoding...")
test_queries = [
    "anak bermain di pantai",
    "kucing duduk di atas meja",
    "a dog playing in the park",
]
try:
    for query in test_queries:
        t0 = time.time()
        emb = engine._encode_text(query)
        elapsed = (time.time() - t0) * 1000
        print(f"   '{query}'")
        print(f"     shape={emb.shape}, dtype={emb.dtype}, "
              f"norm={np.linalg.norm(emb):.4f}, time={elapsed:.1f}ms")
        assert emb.shape == (1, 512), f"Expected (1, 512), got {emb.shape}"
        assert abs(np.linalg.norm(emb) - 1.0) < 0.01, f"Not normalized: {np.linalg.norm(emb)}"
    print("   ✅ All text encodings correct (shape=[1, 512], L2-normalized)")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

# ── Step 5: Test search ──
print("\n[5/6] Testing search_by_text...")
try:
    results = engine.search_by_text("anak bermain di pantai", top_k=5)
    print(f"   Results: {len(results)} items")
    for r in results[:3]:
        print(f"     rank={r['rank']}, score={r['score']:.4f}, image_id={r['image_id']}")
    assert len(results) > 0, "No search results"
    assert results[0]["rank"] == 1
    assert results[0]["score"] >= results[-1]["score"]
    print("   ✅ Search working correctly")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

# ── Step 6: Test get_stats ──
print("\n[6/6] Testing get_stats...")
try:
    stats = engine.get_stats()
    print(f"   Stats: {stats}")
    assert stats["model_loaded"] == True
    assert stats["total_images"] > 0
    print("   ✅ Stats correct")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("🎉 ALL VERIFICATION TESTS PASSED!")
print("=" * 70)
