"""Inspect mclip text encoder checkpoint structure."""
import torch
import numpy as np

print("=" * 60)
print("=== MCLIP Text Encoder Checkpoint ===")
print("=" * 60)

ckpt = torch.load('./exported_model_mclip/mclip_text_encoder.pt', map_location='cpu', weights_only=False)
print(f"\nType: {type(ckpt)}")

if isinstance(ckpt, dict):
    print(f"\nTop-level keys: {list(ckpt.keys())}")
    
    for k in ckpt:
        v = ckpt[k]
        if isinstance(v, dict):
            print(f"\n--- {k} (dict, {len(v)} keys) ---")
            for sk, sv in list(v.items())[:20]:
                if hasattr(sv, 'shape'):
                    print(f"  {sk}: shape={sv.shape}, dtype={sv.dtype}")
                else:
                    print(f"  {sk}: type={type(sv).__name__}, value={sv}")
            if len(v) > 20:
                print(f"  ... and {len(v) - 20} more keys")
        elif hasattr(v, 'shape'):
            print(f"\n--- {k}: Tensor shape={v.shape}, dtype={v.dtype}")
        elif isinstance(v, (str, int, float, bool)):
            print(f"\n--- {k}: {type(v).__name__} = {v}")
        elif isinstance(v, list):
            print(f"\n--- {k}: list of length {len(v)}")
            if len(v) > 0:
                print(f"  First item: {v[0]}")
        else:
            print(f"\n--- {k}: {type(v).__name__}")
else:
    print(f"Checkpoint is not a dict! Type: {type(ckpt)}")

print("\n" + "=" * 60)
print("=== Logit Scale ===")
print("=" * 60)
ls = torch.load('./exported_model_mclip/logit_scale.pt', map_location='cpu', weights_only=False)
print(f"Type: {type(ls)}")
if isinstance(ls, dict):
    for k, v in ls.items():
        if hasattr(v, 'shape'):
            print(f"  {k}: shape={v.shape}, value={v}")
        else:
            print(f"  {k}: {v}")
elif hasattr(ls, 'shape'):
    print(f"  shape={ls.shape}, value={ls}")
else:
    print(f"  value={ls}")

print("\n" + "=" * 60)
print("=== Image Index ===")
print("=" * 60)
idx = np.load('./exported_model_mclip/image_index.npy')
print(f"Shape: {idx.shape}, dtype: {idx.dtype}")
print(f"First row (first 5 vals): {idx[0, :5]}")
