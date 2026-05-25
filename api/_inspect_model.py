import torch

ckpt = torch.load('./exported_model/clip_text_encoder_finetuned.pt', map_location='cpu', weights_only=False)
print('=== Keys ===')
print(list(ckpt.keys()))
print()
print('=== Config ===')
print(ckpt.get('config', 'NO CONFIG'))
print()
print('=== test_metrics ===')
print(ckpt.get('test_metrics', 'N/A'))
print()

# Check shapes of state dict tensors
sd_keys = [k for k in ckpt.keys() if k not in ('config', 'test_metrics')]
print('=== Tensor keys and shapes ===')
for k in sd_keys:
    t = ckpt[k]
    if hasattr(t, 'shape'):
        print(f'  {k}: shape={t.shape}, dtype={t.dtype}')
    else:
        print(f'  {k}: type={type(t).__name__}, value={t}')
