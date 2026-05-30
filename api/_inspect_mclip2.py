"""Inspect mclip state dict keys to find projection layer."""
import torch

ckpt = torch.load('./exported_model_mclip/mclip_text_encoder.pt', map_location='cpu', weights_only=False)
state = ckpt['model_state']

# Print all unique key prefixes
prefixes = set()
for k in state.keys():
    parts = k.split('.')
    prefixes.add('.'.join(parts[:2]))

print("=== Unique key prefixes ===")
for p in sorted(prefixes):
    print(f"  {p}")

# Find keys not starting with 'transformer'
print("\n=== Non-transformer keys ===")
for k, v in state.items():
    if not k.startswith('transformer.'):
        if hasattr(v, 'shape'):
            print(f"  {k}: shape={v.shape}, dtype={v.dtype}")
        else:
            print(f"  {k}: type={type(v).__name__}")

# Print config in full
print("\n=== Full config ===")
for k, v in ckpt['config'].items():
    print(f"  {k}: {v}")
