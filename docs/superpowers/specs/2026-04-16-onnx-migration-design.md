# ONNX Runtime Migration — Design Spec

## Overview

Replace `torch` + `open_clip` + `torchvision` with `onnxruntime` + a pure-Python BPE tokenizer + PIL/numpy image preprocessing. CLIP ViT-B-32 model files are exported to ONNX format and baked into the PyInstaller bundle.

Goal: reduce app size from ~715MB to ~200-250MB (.app) and ~279MB to ~80-100MB (.dmg) while maintaining identical search quality.

## Architecture

```
Before:
  PIL.open → torchvision.transforms → torch.Tensor → model.encode_image() → torch.Tensor → numpy
  query → open_clip.tokenize() → torch.Tensor → model.encode_text() → torch.Tensor → numpy

After:
  PIL.open → PIL resize/crop → numpy normalize → onnxruntime.InferenceSession.run() → numpy
  query → BPE tokenize (pure Python) → numpy → onnxruntime.InferenceSession.run() → numpy
```

The rest of the pipeline (cosine similarity, grouping, ranking, FastAPI endpoints, UI) is unchanged.

## Files Modified

### `videosearch/indexer.py`
- `load_model()` → returns ONNX `InferenceSession` for image encoder (instead of torch model + torchvision preprocess)
- `embed_frame()` → uses PIL/numpy preprocessing + ONNX session instead of torchvision + torch inference
- Remove `import torch`, `import open_clip`, `torch.backends.mkldnn.enabled = False`

### `videosearch/searcher.py`
- `search()` → loads text encoder ONNX session + bundled BPE tokenizer instead of open_clip tokenizer + torch
- Remove `import torch`, `import open_clip`

### `pyproject.toml`
- Remove: `torch`, `torchvision`, `open-clip-torch`
- Add: `onnxruntime`
- Keep: `numpy`, `Pillow`, `click`

### `videosearch_api.spec`
- Remove torch/open_clip hidden imports
- Add ONNX model files as data files
- Add BPE vocab file as data file

## Files Added

### `videosearch/clip_tokenizer.py`
Pure-Python BPE tokenizer extracted from open_clip's `SimpleTokenizer`. Approximately 100 lines. Loads `bpe_simple_vocab_16e6.txt.gz` vocab file. Provides a `tokenize(texts: list[str]) -> np.ndarray` function that returns padded token arrays of shape `(batch, 77)` with dtype `int64`.

### `videosearch/bpe_simple_vocab_16e6.txt.gz`
BPE vocabulary file (~1.3MB). Copied from the open_clip package. Licensed under MIT (same as open_clip).

### `models/clip_image_encoder.onnx`
Exported CLIP ViT-B-32 image encoder. Input: `(1, 3, 224, 224)` float32. Output: `(1, 512)` float32 (not normalized — we L2-normalize after).

### `models/clip_text_encoder.onnx`
Exported CLIP ViT-B-32 text encoder. Input: `(1, 77)` int64 (token IDs). Output: `(1, 512)` float32 (not normalized — we L2-normalize after).

### `scripts/export_onnx.py`
One-time script that loads the PyTorch CLIP model and exports both encoders to ONNX format. Validates numerical equivalence. Not shipped in the app — only used during development.

## Files Unchanged

- `api.py` — calls indexer/searcher, no direct torch usage
- `videosearch/extractor.py` — ffmpeg logic, no ML
- `videosearch/cli.py` — CLI wrapper, calls indexer/searcher
- All UI code (`ui/`)

## Image Preprocessing

Replaces the `torchvision.transforms.Compose` pipeline with pure PIL + numpy:

```python
def preprocess_image(image_path: Path) -> np.ndarray:
    img = Image.open(image_path).convert("RGB")

    # Resize: shortest side to 224, bicubic interpolation
    w, h = img.size
    scale = 224 / min(w, h)
    img = img.resize((round(w * scale), round(h * scale)), Image.BICUBIC)

    # Center crop to 224x224
    w, h = img.size
    left = (w - 224) // 2
    top = (h - 224) // 2
    img = img.crop((left, top, left + 224, top + 224))

    # To float32 array, normalize
    arr = np.array(img, dtype=np.float32) / 255.0
    mean = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
    std = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
    arr = (arr - mean) / std

    # HWC -> CHW, add batch dim
    arr = arr.transpose(2, 0, 1)[np.newaxis, ...]
    return arr
```

## Text Tokenization

The CLIP BPE tokenizer is a self-contained pure-Python implementation:
- Load BPE merges from `bpe_simple_vocab_16e6.txt.gz`
- Lowercase input, apply BPE encoding
- Wrap with `<|startoftext|>` (token 49406) and `<|endoftext|>` (token 49407)
- Pad to 77 tokens
- Return as `np.ndarray` with dtype `int64` and shape `(1, 77)`

## ONNX Export Process

The `scripts/export_onnx.py` script:
1. Loads CLIP ViT-B-32 with open_clip (requires torch, one-time only)
2. Exports `model.visual` as `clip_image_encoder.onnx` with dummy input `(1, 3, 224, 224)`
3. Exports the text transformer as `clip_text_encoder.onnx` with dummy input `(1, 77)` int64
4. Validates: runs both PyTorch and ONNX on the same inputs, asserts `np.allclose(atol=1e-5)`
5. Prints file sizes

## Model File Location

At runtime, ONNX model files are found in this order:
1. PyInstaller bundle (`sys._MEIPASS / "models/"`) — production
2. `models/` relative to project root — development
3. `~/.videosearch/models/` — fallback

Models are baked into the PyInstaller bundle via the spec file's `datas` list.

## Backward Compatibility

- Existing `.videosearch/embeddings.npy` files are fully compatible. They contain 512-dim float32 vectors produced by cosine similarity — the storage format doesn't change.
- ONNX model outputs are numerically equivalent to PyTorch (validated during export, tolerance 1e-5).
- The `search()` and `build_index()` function signatures don't change.
- The FastAPI endpoints don't change.

## Expected Size Impact

| Component          | Before (torch)                 | After (ONNX)           |
|--------------------|--------------------------------|------------------------|
| ML runtime         | ~800MB (torch+torchvision)     | ~30MB (onnxruntime)    |
| Model weights      | ~350MB (downloaded at runtime) | ~170MB (baked in)      |
| PyInstaller bundle | ~395MB                         | ~120-150MB             |
| .app size          | ~715MB                         | ~200-250MB             |
| .dmg size          | ~279MB                         | ~80-100MB              |
| First launch       | Needs model download           | Works immediately      |

## Dependencies

### Removed
- `torch` (~800MB)
- `torchvision` (~50MB)
- `open-clip-torch` (~50MB)

### Added
- `onnxruntime` (~30MB)

### Unchanged
- `numpy`, `Pillow`, `click`, `fastapi`, `uvicorn`

## Testing

- Export script validates numerical equivalence between PyTorch and ONNX outputs
- Existing test suite should pass with no changes (tests call `search()` / `build_index()`)
- Manual validation: index a folder with PyTorch version, search with ONNX version — same results
