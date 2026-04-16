# ONNX Runtime Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PyTorch + open_clip with ONNX Runtime to reduce app bundle from ~715MB to ~200-250MB while maintaining identical search results.

**Architecture:** Export CLIP ViT-B-32 image and text encoders to ONNX format. Replace torch inference with onnxruntime sessions. Replace torchvision preprocessing with PIL/numpy. Replace open_clip tokenizer with a pure-Python BPE tokenizer. Bake model files into the PyInstaller bundle.

**Tech Stack:** onnxruntime, numpy, Pillow, pure-Python BPE tokenizer

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `scripts/export_onnx.py` | Create | One-time ONNX export script (dev only) |
| `models/clip_image_encoder.onnx` | Create (generated) | CLIP image encoder weights |
| `models/clip_text_encoder.onnx` | Create (generated) | CLIP text encoder weights |
| `videosearch/clip_tokenizer.py` | Create | Pure-Python BPE tokenizer |
| `videosearch/bpe_simple_vocab_16e6.txt.gz` | Create (copied) | BPE vocabulary file |
| `videosearch/indexer.py` | Modify | Swap torch → onnxruntime for image encoding |
| `videosearch/searcher.py` | Modify | Swap torch → onnxruntime for text encoding |
| `tests/test_searcher.py` | Modify | Remove torch mocking, use numpy mocking |
| `tests/test_tokenizer.py` | Create | Tests for BPE tokenizer |
| `pyproject.toml` | Modify | Swap dependencies |
| `videosearch_api.spec` | Modify | Update PyInstaller config |

---

### Task 1: Export CLIP model to ONNX format

**Files:**
- Create: `scripts/export_onnx.py`
- Create: `models/clip_image_encoder.onnx` (generated output)
- Create: `models/clip_text_encoder.onnx` (generated output)

- [ ] **Step 1: Create the export script**

```python
# scripts/export_onnx.py
"""One-time script to export CLIP ViT-B-32 to ONNX format.

Requires torch and open_clip (the existing venv has them).
Run once: python scripts/export_onnx.py
Produces: models/clip_image_encoder.onnx, models/clip_text_encoder.onnx
"""

import warnings
from pathlib import Path

import numpy as np
import onnxruntime as ort
import open_clip
import torch

MODELS_DIR = Path(__file__).parent.parent / "models"


def export_image_encoder(model):
    """Export the visual (image) encoder to ONNX."""
    MODELS_DIR.mkdir(exist_ok=True)
    output_path = MODELS_DIR / "clip_image_encoder.onnx"

    dummy_image = torch.randn(1, 3, 224, 224)

    class ImageEncoder(torch.nn.Module):
        def __init__(self, clip_model):
            super().__init__()
            self.visual = clip_model.visual

        def forward(self, image):
            return self.visual(image)

    wrapper = ImageEncoder(model)
    wrapper.eval()

    torch.onnx.export(
        wrapper,
        dummy_image,
        str(output_path),
        input_names=["image"],
        output_names=["embedding"],
        dynamic_axes={"image": {0: "batch"}, "embedding": {0: "batch"}},
        opset_version=17,
    )
    print(f"Exported image encoder: {output_path} ({output_path.stat().st_size / 1e6:.1f} MB)")
    return output_path


def export_text_encoder(model):
    """Export the text encoder to ONNX."""
    MODELS_DIR.mkdir(exist_ok=True)
    output_path = MODELS_DIR / "clip_text_encoder.onnx"

    dummy_text = torch.randint(0, 49408, (1, 77), dtype=torch.long)

    class TextEncoder(torch.nn.Module):
        def __init__(self, clip_model):
            super().__init__()
            self.clip = clip_model

        def forward(self, text):
            return self.clip.encode_text(text)

    wrapper = TextEncoder(model)
    wrapper.eval()

    torch.onnx.export(
        wrapper,
        dummy_text,
        str(output_path),
        input_names=["text"],
        output_names=["embedding"],
        dynamic_axes={"text": {0: "batch"}, "embedding": {0: "batch"}},
        opset_version=17,
    )
    print(f"Exported text encoder: {output_path} ({output_path.stat().st_size / 1e6:.1f} MB)")
    return output_path


def validate(model, image_onnx_path, text_onnx_path):
    """Validate ONNX outputs match PyTorch outputs."""
    # Image encoder validation
    dummy_image = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        torch_img_out = model.encode_image(dummy_image).numpy()

    img_session = ort.InferenceSession(str(image_onnx_path))
    onnx_img_out = img_session.run(None, {"image": dummy_image.numpy()})[0]

    assert np.allclose(torch_img_out, onnx_img_out, atol=1e-5), \
        f"Image encoder mismatch! Max diff: {np.abs(torch_img_out - onnx_img_out).max()}"
    print(f"Image encoder validated: max diff = {np.abs(torch_img_out - onnx_img_out).max():.2e}")

    # Text encoder validation
    tokenizer = open_clip.get_tokenizer("ViT-B-32")
    tokens = tokenizer(["a photo of a cat"])
    with torch.no_grad():
        torch_text_out = model.encode_text(tokens).numpy()

    text_session = ort.InferenceSession(str(text_onnx_path))
    onnx_text_out = text_session.run(None, {"text": tokens.numpy().astype(np.int64)})[0]

    assert np.allclose(torch_text_out, onnx_text_out, atol=1e-5), \
        f"Text encoder mismatch! Max diff: {np.abs(torch_text_out - onnx_text_out).max()}"
    print(f"Text encoder validated: max diff = {np.abs(torch_text_out - onnx_text_out).max():.2e}")

    print("All validations passed!")


def main():
    print("Loading CLIP ViT-B-32...")
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message="QuickGELU mismatch")
        model, _, _ = open_clip.create_model_and_transforms("ViT-B-32", pretrained="openai")
    model.eval()

    print("Exporting image encoder...")
    img_path = export_image_encoder(model)

    print("Exporting text encoder...")
    text_path = export_text_encoder(model)

    print("Validating...")
    validate(model, img_path, text_path)

    total_mb = (img_path.stat().st_size + text_path.stat().st_size) / 1e6
    print(f"\nTotal model size: {total_mb:.1f} MB")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Install onnxruntime in the venv**

Run: `source venv/bin/activate && pip install onnxruntime`

- [ ] **Step 3: Run the export script**

Run: `source venv/bin/activate && python scripts/export_onnx.py`

Expected output:
```
Loading CLIP ViT-B-32...
Exporting image encoder...
Exported image encoder: models/clip_image_encoder.onnx (X.X MB)
Exporting text encoder...
Exported text encoder: models/clip_text_encoder.onnx (X.X MB)
Validating...
Image encoder validated: max diff = X.XXe-XX
Text encoder validated: max diff = X.XXe-XX
All validations passed!
```

- [ ] **Step 4: Verify model files exist**

Run: `ls -lh models/*.onnx`

Expected: Two `.onnx` files, combined ~170MB or less.

- [ ] **Step 5: Add models/ to .gitignore and commit**

The ONNX model files are large binaries — do not commit them to git. They are generated by the export script and baked into the PyInstaller bundle.

```bash
echo "models/" >> .gitignore
git add scripts/export_onnx.py .gitignore
git commit -m "feat: add ONNX export script for CLIP ViT-B-32"
```

---

### Task 2: Create pure-Python BPE tokenizer

**Files:**
- Create: `videosearch/clip_tokenizer.py`
- Copy: `videosearch/bpe_simple_vocab_16e6.txt.gz`
- Create: `tests/test_tokenizer.py`

- [ ] **Step 1: Write the tokenizer test**

```python
# tests/test_tokenizer.py
import numpy as np
import pytest

from videosearch.clip_tokenizer import tokenize


def test_tokenize_returns_correct_shape():
    """tokenize returns (1, 77) int64 array."""
    result = tokenize("a photo of a cat")
    assert result.shape == (1, 77)
    assert result.dtype == np.int64


def test_tokenize_starts_with_sot_token():
    """First token is <start_of_text> (49406)."""
    result = tokenize("hello")
    assert result[0, 0] == 49406


def test_tokenize_has_eot_token():
    """Token sequence contains <end_of_text> (49407) after the text."""
    result = tokenize("hi")
    tokens = result[0]
    non_zero = tokens[tokens != 0]
    assert non_zero[-1] == 49407


def test_tokenize_pads_to_77():
    """Short text is zero-padded to 77 tokens."""
    result = tokenize("a")
    assert result[0, -1] == 0  # last token is padding


def test_tokenize_truncates_long_text():
    """Text longer than 77 tokens is truncated, ending with eot."""
    long_text = " ".join(["word"] * 200)
    result = tokenize(long_text)
    assert result.shape == (1, 77)
    assert result[0, -1] == 49407  # last token is eot


def test_tokenize_batch():
    """tokenize handles a list of strings."""
    result = tokenize(["hello", "world"])
    assert result.shape == (2, 77)
    assert result.dtype == np.int64
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source venv/bin/activate && pytest tests/test_tokenizer.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'videosearch.clip_tokenizer'`

- [ ] **Step 3: Copy the BPE vocabulary file**

```bash
cp venv/lib/python3.13/site-packages/open_clip/bpe_simple_vocab_16e6.txt.gz videosearch/bpe_simple_vocab_16e6.txt.gz
```

- [ ] **Step 4: Write the tokenizer implementation**

```python
# videosearch/clip_tokenizer.py
"""Pure-Python BPE tokenizer for CLIP ViT-B-32.

Extracted from open_clip's SimpleTokenizer. No torch dependency.
"""

import gzip
import html
import re
from functools import lru_cache
from pathlib import Path

import numpy as np

CONTEXT_LENGTH = 77
SOT_TOKEN = 49406  # <start_of_text>
EOT_TOKEN = 49407  # <end_of_text>


@lru_cache()
def _default_bpe_path() -> str:
    return str(Path(__file__).parent / "bpe_simple_vocab_16e6.txt.gz")


@lru_cache()
def _bytes_to_unicode() -> dict[int, str]:
    bs = (
        list(range(ord("!"), ord("~") + 1))
        + list(range(ord("¡"), ord("¬") + 1))
        + list(range(ord("®"), ord("ÿ") + 1))
    )
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b)
            cs.append(256 + n)
            n += 1
    return dict(zip(bs, [chr(c) for c in cs]))


def _get_pairs(word: tuple[str, ...]) -> set[tuple[str, str]]:
    pairs = set()
    prev = word[0]
    for char in word[1:]:
        pairs.add((prev, char))
        prev = char
    return pairs


class CLIPTokenizer:
    def __init__(self, bpe_path: str | None = None):
        bpe_path = bpe_path or _default_bpe_path()
        self.byte_encoder = _bytes_to_unicode()
        self.byte_decoder = {v: k for k, v in self.byte_encoder.items()}

        merges = gzip.open(bpe_path).read().decode("utf-8").split("\n")
        merges = merges[1 : 49152 - 256 - 2 + 1]
        merges = [tuple(merge.split()) for merge in merges]

        vocab = list(self.byte_encoder.values())
        vocab = vocab + [v + "</w>" for v in vocab]
        for merge in merges:
            vocab.append("".join(merge))
        vocab.extend(["<start_of_text>", "<end_of_text>"])

        self.encoder = dict(zip(vocab, range(len(vocab))))
        self.bpe_ranks = dict(zip(merges, range(len(merges))))
        self.cache: dict[str, str] = {}
        self.pat = re.compile(
            r"""<start_of_text>|<end_of_text>|'s|'t|'re|'ve|'m|'ll|'d|[\w]+|[\d]|[^\s\w\d]+""",
            re.IGNORECASE,
        )

    def _bpe(self, token: str) -> str:
        if token in self.cache:
            return self.cache[token]
        word = tuple(token[:-1]) + (token[-1] + "</w>",)
        pairs = _get_pairs(word)
        if not pairs:
            return token + "</w>"

        while True:
            bigram = min(pairs, key=lambda pair: self.bpe_ranks.get(pair, float("inf")))
            if bigram not in self.bpe_ranks:
                break
            first, second = bigram
            new_word: list[str] = []
            i = 0
            while i < len(word):
                try:
                    j = word.index(first, i)
                except ValueError:
                    new_word.extend(word[i:])
                    break
                new_word.extend(word[i:j])
                if word[j] == first and j < len(word) - 1 and word[j + 1] == second:
                    new_word.append(first + second)
                    i = j + 2
                else:
                    new_word.append(word[j])
                    i = j + 1
            word = tuple(new_word)
            if len(word) == 1:
                break
            pairs = _get_pairs(word)

        result = " ".join(word)
        self.cache[token] = result
        return result

    def encode(self, text: str) -> list[int]:
        text = " ".join(text.split()).strip().lower()
        tokens: list[int] = []
        for match in re.findall(self.pat, text):
            encoded = "".join(self.byte_encoder[b] for b in match.encode("utf-8"))
            tokens.extend(self.encoder[bt] for bt in self._bpe(encoded).split(" "))
        return tokens


# Module-level singleton
_tokenizer: CLIPTokenizer | None = None


def tokenize(texts: str | list[str]) -> np.ndarray:
    """Tokenize text(s) for CLIP.

    Args:
        texts: A single string or list of strings.

    Returns:
        np.ndarray of shape (batch, 77) with dtype int64.
        Tokens are padded with zeros and wrapped with SOT/EOT.
    """
    global _tokenizer
    if _tokenizer is None:
        _tokenizer = CLIPTokenizer()

    if isinstance(texts, str):
        texts = [texts]

    result = np.zeros((len(texts), CONTEXT_LENGTH), dtype=np.int64)
    for i, text in enumerate(texts):
        tokens = [SOT_TOKEN] + _tokenizer.encode(text) + [EOT_TOKEN]
        if len(tokens) > CONTEXT_LENGTH:
            tokens = tokens[:CONTEXT_LENGTH]
            tokens[-1] = EOT_TOKEN
        result[i, : len(tokens)] = tokens

    return result
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `source venv/bin/activate && pytest tests/test_tokenizer.py -v`
Expected: All 6 tests PASS.

- [ ] **Step 6: Cross-validate against open_clip tokenizer**

Run a quick manual check that outputs match:

```bash
source venv/bin/activate && python -c "
import numpy as np
import open_clip
from videosearch.clip_tokenizer import tokenize

oc_tok = open_clip.get_tokenizer('ViT-B-32')
oc_result = oc_tok(['a photo of a dog playing fetch']).numpy().astype(np.int64)
my_result = tokenize('a photo of a dog playing fetch')

print('open_clip tokens:', oc_result[0, :12])
print('our tokens:     ', my_result[0, :12])
print('match:', np.array_equal(oc_result, my_result))
"
```

Expected: `match: True`

- [ ] **Step 7: Commit**

```bash
git add videosearch/clip_tokenizer.py videosearch/bpe_simple_vocab_16e6.txt.gz tests/test_tokenizer.py
git commit -m "feat: add pure-Python BPE tokenizer for CLIP (no torch dependency)"
```

---

### Task 3: Rewrite indexer to use ONNX Runtime

**Files:**
- Modify: `videosearch/indexer.py`
- Modify: `tests/test_indexer.py`

- [ ] **Step 1: Update the indexer test for ONNX**

The test `test_embed_frame_returns_normalized_vector` calls `load_model()` directly. Update it to work with the new ONNX-based API. The other indexer tests mock `load_model` and `embed_frame` so they don't need changes.

In `tests/test_indexer.py`, replace the existing `test_embed_frame_returns_normalized_vector` test:

```python
def test_embed_frame_returns_normalized_vector(tmp_path):
    """embed_frame returns a 512-dim L2-normalized float32 vector."""
    from videosearch.indexer import load_image_session, embed_frame
    from PIL import Image

    # Create a tiny fake JPEG
    frame_path = tmp_path / "frame.jpg"
    Image.new("RGB", (224, 224), color=(128, 64, 32)).save(frame_path)

    session = load_image_session()
    emb = embed_frame(session, frame_path)

    assert emb.shape == (512,)
    assert emb.dtype == np.float32
    norm = np.linalg.norm(emb)
    assert abs(norm - 1.0) < 1e-5, f"Expected unit vector, got norm={norm}"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `source venv/bin/activate && pytest tests/test_indexer.py::test_embed_frame_returns_normalized_vector -v`
Expected: FAIL — `ImportError: cannot import name 'load_image_session'`

- [ ] **Step 3: Rewrite indexer.py**

Replace the entire content of `videosearch/indexer.py`:

```python
import json
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

from .extractor import extract_frames

INDEX_DIR = ".videosearch"
EMBEDDINGS_FILE = "embeddings.npy"
METADATA_FILE = "metadata.json"
SUPPORTED_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov"}

# CLIP image preprocessing constants
_CLIP_MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
_CLIP_STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)


def _find_model(filename: str) -> Path:
    """Locate an ONNX model file.

    Search order:
    1. PyInstaller bundle (sys._MEIPASS / "models/")
    2. models/ relative to project root
    3. ~/.videosearch/models/
    """
    if getattr(sys, "frozen", False):
        p = Path(sys._MEIPASS) / "models" / filename
        if p.exists():
            return p
    # Development: models/ next to the videosearch package
    p = Path(__file__).parent.parent / "models" / filename
    if p.exists():
        return p
    # Fallback
    p = Path.home() / ".videosearch" / "models" / filename
    if p.exists():
        return p
    raise FileNotFoundError(
        f"ONNX model '{filename}' not found. Run 'python scripts/export_onnx.py' first."
    )


def load_image_session() -> ort.InferenceSession:
    """Load the CLIP image encoder ONNX session."""
    model_path = _find_model("clip_image_encoder.onnx")
    return ort.InferenceSession(str(model_path))


def preprocess_image(image_path: Path) -> np.ndarray:
    """Preprocess an image for CLIP: resize, center crop, normalize.

    Returns a float32 array of shape (1, 3, 224, 224).
    """
    img = Image.open(image_path).convert("RGB")

    # Resize shortest side to 224, bicubic
    w, h = img.size
    scale = 224 / min(w, h)
    img = img.resize((round(w * scale), round(h * scale)), Image.BICUBIC)

    # Center crop to 224x224
    w, h = img.size
    left = (w - 224) // 2
    top = (h - 224) // 2
    img = img.crop((left, top, left + 224, top + 224))

    # To float32 [0, 1], normalize, HWC -> CHW, add batch dim
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = (arr - _CLIP_MEAN) / _CLIP_STD
    arr = arr.transpose(2, 0, 1)[np.newaxis, ...]
    return arr


def embed_frame(session: ort.InferenceSession, frame_path: Path) -> np.ndarray:
    """Encode a single image frame with CLIP via ONNX Runtime.

    Returns a 512-dim L2-normalized float32 numpy vector.
    """
    image = preprocess_image(frame_path)
    outputs = session.run(None, {"image": image})
    features = outputs[0].squeeze(0)
    features = features / np.linalg.norm(features)
    return features.astype(np.float32)


def load_index(video_dir: Path) -> tuple[np.ndarray, list]:
    """Load embeddings and metadata from the index directory.

    Returns (embeddings, metadata). If no index exists, returns
    (empty array of shape (0, 512), []).
    """
    index_dir = video_dir / INDEX_DIR
    emb_path = index_dir / EMBEDDINGS_FILE
    meta_path = index_dir / METADATA_FILE

    if not emb_path.exists() or not meta_path.exists():
        return np.zeros((0, 512), dtype=np.float32), []

    embeddings = np.load(emb_path)
    with open(meta_path) as f:
        metadata = json.load(f)
    return embeddings, metadata


def save_index(video_dir: Path, embeddings: np.ndarray, metadata: list) -> None:
    """Persist embeddings and metadata to the index directory."""
    index_dir = video_dir / INDEX_DIR
    index_dir.mkdir(exist_ok=True)
    np.save(index_dir / EMBEDDINGS_FILE, embeddings)
    with open(index_dir / METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)


def build_index(video_dir: Path, interval: int = 5) -> None:
    """Build or update the search index for all videos in video_dir.

    Skips files already indexed with the same mtime.
    Replaces entries for files whose mtime has changed.
    """
    session = load_image_session()
    embeddings, metadata = load_index(video_dir)

    indexed_keys = {(m["file"], m["mtime"]) for m in metadata}

    new_embeddings: list[np.ndarray] = []
    new_metadata: list[dict] = []

    for video_path in sorted(video_dir.iterdir()):
        if video_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        mtime = int(video_path.stat().st_mtime)
        file_key = video_path.name

        if (file_key, mtime) in indexed_keys:
            continue

        keep_indices = [i for i, m in enumerate(metadata) if m["file"] != file_key]
        metadata = [metadata[i] for i in keep_indices]
        if len(embeddings) > 0 and len(keep_indices) < len(embeddings):
            embeddings = embeddings[keep_indices] if keep_indices else np.zeros((0, 512), dtype=np.float32)

        print(f"Indexing {file_key}...")
        try:
            for frame_path, timestamp_sec in extract_frames(video_path, interval):
                emb = embed_frame(session, frame_path)
                new_embeddings.append(emb)
                minutes, seconds = divmod(timestamp_sec, 60)
                new_metadata.append({
                    "file": file_key,
                    "mtime": mtime,
                    "timestamp_sec": timestamp_sec,
                    "timestamp_str": f"{minutes}:{seconds:02d}",
                })
        except RuntimeError as e:
            print(f"  Warning: skipping {file_key}: {e}")
            continue

    if new_embeddings:
        new_arr = np.stack(new_embeddings).astype(np.float32)
        embeddings = np.concatenate([embeddings, new_arr]) if len(embeddings) > 0 else new_arr
        metadata = metadata + new_metadata

    save_index(video_dir, embeddings, metadata)
    print(f"Index complete: {len(metadata)} clips indexed.")
```

- [ ] **Step 4: Update remaining indexer tests that mock load_model**

In `tests/test_indexer.py`, the tests `test_build_index_skips_already_indexed_files`, `test_build_index_reindexes_changed_file`, and `test_build_index_prints_progress` mock `load_model`. Update the mock targets:

- Replace `patch("videosearch.indexer.load_model")` with `patch("videosearch.indexer.load_image_session")`
- Replace `mock_load.return_value = (MagicMock(), MagicMock())` with `mock_load.return_value = MagicMock()`
- `mock_embed.return_value` stays the same (it returns a numpy vector)
- In `test_build_index_reindexes_changed_file` and `test_build_index_prints_progress`, update `mock_embed` signature: the mock is patched at `videosearch.indexer.embed_frame`, which now takes `(session, frame_path)` instead of `(model, preprocess, frame_path)`. The mock doesn't care about argument count, so no actual change needed in the mock setup.

Replace the three test functions:

```python
def test_build_index_skips_already_indexed_files(tmp_path):
    """build_index skips files whose mtime matches the index."""
    from videosearch.indexer import build_index

    existing_emb = np.random.randn(2, 512).astype(np.float32)
    existing_meta = [
        {"file": "a.mp4", "mtime": 1000, "timestamp_sec": 0, "timestamp_str": "0:00"},
        {"file": "a.mp4", "mtime": 1000, "timestamp_sec": 5, "timestamp_str": "0:05"},
    ]
    save_index(tmp_path, existing_emb, existing_meta)

    video = tmp_path / "a.mp4"
    video.write_bytes(b"fake")
    import os
    os.utime(video, (1000, 1000))

    with patch("videosearch.indexer.load_image_session") as mock_session, \
         patch("videosearch.indexer.extract_frames") as mock_extract:
        mock_session.return_value = MagicMock()
        mock_extract.return_value = iter([])

        build_index(tmp_path, interval=5)

    mock_extract.assert_not_called()


def test_build_index_reindexes_changed_file(tmp_path):
    """build_index replaces entries for a file whose mtime changed."""
    from videosearch.indexer import build_index
    from PIL import Image

    old_emb = np.ones((1, 512), dtype=np.float32)
    old_meta = [{"file": "a.mp4", "mtime": 1000, "timestamp_sec": 0, "timestamp_str": "0:00"}]
    save_index(tmp_path, old_emb, old_meta)

    video = tmp_path / "a.mp4"
    video.write_bytes(b"fake")
    import os
    os.utime(video, (9999, 9999))

    fake_frame = tmp_path / "frame.jpg"
    Image.new("RGB", (224, 224)).save(fake_frame)

    new_emb = np.random.randn(512).astype(np.float32)
    new_emb /= np.linalg.norm(new_emb)

    with patch("videosearch.indexer.load_image_session") as mock_session, \
         patch("videosearch.indexer.extract_frames") as mock_extract, \
         patch("videosearch.indexer.embed_frame") as mock_embed:

        mock_session.return_value = MagicMock()
        mock_extract.return_value = iter([(fake_frame, 0)])
        mock_embed.return_value = new_emb

        build_index(tmp_path, interval=5)

    _, metadata = load_index(tmp_path)
    assert len(metadata) == 1
    assert metadata[0]["mtime"] == 9999


def test_build_index_prints_progress(tmp_path, capsys):
    """build_index prints a line per video and a completion summary."""
    from videosearch.indexer import build_index
    from PIL import Image

    video = tmp_path / "myclip.mp4"
    video.write_bytes(b"fake")
    fake_frame = tmp_path / "frame.jpg"
    Image.new("RGB", (224, 224)).save(fake_frame)

    emb_vec = np.random.randn(512).astype(np.float32)
    emb_vec /= np.linalg.norm(emb_vec)

    with patch("videosearch.indexer.load_image_session") as mock_session, \
         patch("videosearch.indexer.extract_frames") as mock_extract, \
         patch("videosearch.indexer.embed_frame") as mock_embed:

        mock_session.return_value = MagicMock()
        mock_extract.return_value = iter([(fake_frame, 0)])
        mock_embed.return_value = emb_vec

        build_index(tmp_path, interval=5)

    captured = capsys.readouterr()
    assert "myclip.mp4" in captured.out
    assert "Index complete" in captured.out
```

- [ ] **Step 5: Run indexer tests**

Run: `source venv/bin/activate && pytest tests/test_indexer.py -v`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add videosearch/indexer.py tests/test_indexer.py
git commit -m "refactor: replace torch with ONNX Runtime in indexer"
```

---

### Task 4: Rewrite searcher to use ONNX Runtime

**Files:**
- Modify: `videosearch/searcher.py`
- Modify: `tests/test_searcher.py`

- [ ] **Step 1: Rewrite searcher.py**

Replace the entire content of `videosearch/searcher.py`:

```python
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort

from .clip_tokenizer import tokenize
from .indexer import _find_model, load_index


def load_text_session() -> ort.InferenceSession:
    """Load the CLIP text encoder ONNX session."""
    model_path = _find_model("clip_text_encoder.onnx")
    return ort.InferenceSession(str(model_path))


def search(
    video_dir: Path,
    query: str,
    top_k: int = 5,
    threshold: float = 0.2,
) -> list[dict]:
    """Search the video index for clips matching the text query.

    Returns a list of result dicts (up to top_k), each containing:
      file, best_score, timestamps (list of {timestamp_sec, timestamp_str, score})
    Sorted by best_score descending. Only results >= threshold are returned.
    """
    embeddings, metadata = load_index(video_dir)

    if len(embeddings) == 0:
        raise RuntimeError(
            f"No index found in {video_dir}. Run 'videosearch index <dir>' first."
        )

    session = load_text_session()
    tokens = tokenize(query)
    outputs = session.run(None, {"text": tokens})
    query_emb = outputs[0].squeeze(0)
    query_vec = (query_emb / np.linalg.norm(query_emb)).astype(np.float32)

    scores = embeddings @ query_vec

    groups: dict[str, list[dict]] = {}
    for idx, score_val in enumerate(scores):
        score_f = float(score_val)
        if score_f < threshold:
            continue
        file_name = metadata[idx]["file"]
        hit = {
            "timestamp_sec": metadata[idx]["timestamp_sec"],
            "timestamp_str": metadata[idx]["timestamp_str"],
            "score": score_f,
        }
        if file_name not in groups:
            groups[file_name] = []
        groups[file_name].append(hit)

    for hits in groups.values():
        hits.sort(key=lambda h: h["score"], reverse=True)

    ranked_videos = sorted(groups.items(), key=lambda g: g[1][0]["score"], reverse=True)

    results = []
    for file_name, hits in ranked_videos[:top_k]:
        results.append({
            "file": file_name,
            "best_score": hits[0]["score"],
            "timestamps": hits,
        })

    return results
```

- [ ] **Step 2: Rewrite searcher tests to remove torch dependency**

Replace the entire content of `tests/test_searcher.py`:

```python
import numpy as np
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from videosearch.searcher import search


def _make_index(tmp_path: Path, embeddings: np.ndarray, metadata: list) -> None:
    from videosearch.indexer import save_index
    save_index(tmp_path, embeddings, metadata)


def _unit_vec(v: np.ndarray) -> np.ndarray:
    return (v / np.linalg.norm(v)).astype(np.float32)


def test_search_returns_top_k_results(tmp_path):
    """search returns at most top_k results, ranked by score."""
    query_dir = np.array([1.0, 0.0, 0.0] + [0.0] * 509, dtype=np.float32)
    embeddings = np.array([
        _unit_vec(np.array([0.1, 1.0] + [0.0] * 510, dtype=np.float32)),
        _unit_vec(np.array([1.0, 0.1] + [0.0] * 510, dtype=np.float32)),
        _unit_vec(np.array([0.5, 0.5] + [0.0] * 510, dtype=np.float32)),
        _unit_vec(np.array([0.2, 0.8] + [0.0] * 510, dtype=np.float32)),
    ])
    metadata = [
        {"file": "a.mp4", "mtime": 1, "timestamp_sec": 0, "timestamp_str": "0:00"},
        {"file": "b.mp4", "mtime": 2, "timestamp_sec": 5, "timestamp_str": "0:05"},
        {"file": "c.mp4", "mtime": 3, "timestamp_sec": 0, "timestamp_str": "0:00"},
        {"file": "d.mp4", "mtime": 4, "timestamp_sec": 0, "timestamp_str": "0:00"},
    ]
    _make_index(tmp_path, embeddings, metadata)

    query_emb = _unit_vec(query_dir)

    mock_session = MagicMock()
    mock_session.run.return_value = [query_emb.reshape(1, 512)]

    with patch("videosearch.searcher.load_text_session") as mock_load, \
         patch("videosearch.searcher.tokenize") as mock_tokenize:
        mock_load.return_value = mock_session
        mock_tokenize.return_value = np.zeros((1, 77), dtype=np.int64)

        results = search(tmp_path, "test query", top_k=2, threshold=0.0)

    assert len(results) == 2
    assert results[0]["file"] == "b.mp4"
    assert results[0]["best_score"] > results[1]["best_score"]


def test_search_filters_by_threshold(tmp_path):
    """search excludes results below threshold."""
    query_dir = np.array([1.0] + [0.0] * 511, dtype=np.float32)
    low_score_emb = _unit_vec(np.array([0.01] + [1.0] + [0.0] * 510, dtype=np.float32))
    embeddings = low_score_emb.reshape(1, 512)
    metadata = [{"file": "x.mp4", "mtime": 1, "timestamp_sec": 0, "timestamp_str": "0:00"}]
    _make_index(tmp_path, embeddings, metadata)

    mock_session = MagicMock()
    mock_session.run.return_value = [query_dir.reshape(1, 512)]

    with patch("videosearch.searcher.load_text_session") as mock_load, \
         patch("videosearch.searcher.tokenize") as mock_tokenize:
        mock_load.return_value = mock_session
        mock_tokenize.return_value = np.zeros((1, 77), dtype=np.int64)

        results = search(tmp_path, "query", top_k=5, threshold=0.99)

    assert results == []


def test_search_raises_when_no_index(tmp_path):
    """search raises RuntimeError when index does not exist."""
    with pytest.raises(RuntimeError, match="No index found"):
        search(tmp_path, "anything")


def test_search_result_contains_required_keys(tmp_path):
    """Each result dict contains file, best_score, timestamps."""
    query_dir = np.array([1.0] + [0.0] * 511, dtype=np.float32)
    emb = _unit_vec(np.array([1.0] + [0.1] + [0.0] * 510, dtype=np.float32))
    embeddings = emb.reshape(1, 512)
    metadata = [{"file": "v.mp4", "mtime": 1, "timestamp_sec": 10, "timestamp_str": "0:10"}]
    _make_index(tmp_path, embeddings, metadata)

    mock_session = MagicMock()
    mock_session.run.return_value = [query_dir.reshape(1, 512)]

    with patch("videosearch.searcher.load_text_session") as mock_load, \
         patch("videosearch.searcher.tokenize") as mock_tokenize:
        mock_load.return_value = mock_session
        mock_tokenize.return_value = np.zeros((1, 77), dtype=np.int64)

        results = search(tmp_path, "test", top_k=1, threshold=0.0)

    assert len(results) == 1
    r = results[0]
    assert r["file"] == "v.mp4"
    assert r["best_score"] > 0
    assert len(r["timestamps"]) == 1
    assert r["timestamps"][0]["timestamp_str"] == "0:10"
    assert r["timestamps"][0]["timestamp_sec"] == 10
    assert isinstance(r["timestamps"][0]["score"], float)
```

- [ ] **Step 3: Run all searcher tests**

Run: `source venv/bin/activate && pytest tests/test_searcher.py -v`
Expected: All 4 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add videosearch/searcher.py tests/test_searcher.py
git commit -m "refactor: replace torch with ONNX Runtime in searcher"
```

---

### Task 5: Update dependencies and PyInstaller spec

**Files:**
- Modify: `pyproject.toml`
- Modify: `videosearch_api.spec`

- [ ] **Step 1: Update pyproject.toml**

Replace the dependencies section in `pyproject.toml`:

```toml
[project]
name = "videosearch"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "onnxruntime",
    "numpy",
    "click",
    "Pillow",
]
```

- [ ] **Step 2: Update videosearch_api.spec**

Replace the entire content of `videosearch_api.spec`:

```python
# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for bundling the VideoSearch API server (ONNX backend)."""

block_cipher = None

a = Analysis(
    ["api.py"],
    pathex=["."],
    binaries=[],
    datas=[
        ("videosearch", "videosearch"),
        ("models", "models"),
    ],
    hiddenimports=[
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "uvicorn.lifespan.off",
        "fastapi",
        "pydantic",
        "starlette",
        "starlette.routing",
        "starlette.middleware",
        "starlette.middleware.cors",
        "anyio",
        "anyio._backends",
        "anyio._backends._asyncio",
        "onnxruntime",
        "PIL",
        "numpy",
        "videosearch",
        "videosearch.indexer",
        "videosearch.searcher",
        "videosearch.extractor",
        "videosearch.clip_tokenizer",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "torch",
        "torchvision",
        "open_clip",
        "matplotlib",
        "tkinter",
        "PyQt5",
        "PyQt6",
        "PySide2",
        "PySide6",
        "IPython",
        "jupyter",
        "notebook",
        "scipy",
        "pandas",
        "sklearn",
        "tensorflow",
    ],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="videosearch-api",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    target_arch=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="videosearch-api",
)
```

- [ ] **Step 3: Commit**

```bash
git add pyproject.toml videosearch_api.spec
git commit -m "chore: update deps and PyInstaller spec for ONNX Runtime"
```

---

### Task 6: Run full test suite and validate end-to-end

**Files:**
- No file changes — validation only.

- [ ] **Step 1: Run all tests**

Run: `source venv/bin/activate && pytest tests/ -v`
Expected: All tests PASS (tokenizer, indexer, searcher, extractor, cli).

- [ ] **Step 2: Validate end-to-end with real videos**

Run the CLI against an already-indexed folder to confirm ONNX produces valid search results:

```bash
source venv/bin/activate && python -m videosearch.cli search /path/to/indexed/folder "a person walking"
```

Expected: Search results with scores and timestamps, matching what the PyTorch version produced.

- [ ] **Step 3: Test the API server**

```bash
source venv/bin/activate && python api.py &
sleep 3
curl -s "http://127.0.0.1:8008/api/library"
curl -s "http://127.0.0.1:8008/api/search?q=person+walking&top_k=5"
kill %1
```

Expected: Library returns folders, search returns results.

- [ ] **Step 4: Commit any fixes if needed**

If any test or validation revealed issues, fix and commit them here.

---

### Task 7: Rebuild PyInstaller bundle and Tauri app

**Files:**
- No source changes — build and verify.

- [ ] **Step 1: Rebuild the PyInstaller sidecar**

```bash
./scripts/build-sidecar.sh
```

Expected: Completes successfully. Check the new sidecar size:

```bash
du -sh ui/src-tauri/binaries/videosearch-api
```

Expected: ~120-150MB (down from ~395MB).

- [ ] **Step 2: Test the PyInstaller binary**

```bash
lsof -ti:8008 | xargs kill -9 2>/dev/null
ui/src-tauri/binaries/videosearch-api/videosearch-api &
sleep 5
curl -s "http://127.0.0.1:8008/api/library"
curl -s "http://127.0.0.1:8008/api/search?q=test&top_k=3"
kill %1
```

Expected: API responds correctly.

- [ ] **Step 3: Rebuild the Tauri app**

```bash
export PATH="$HOME/.cargo/bin:$PATH"
cd ui && npm run tauri build -- --bundles app
```

Expected: `VideoSearch.app` built successfully.

- [ ] **Step 4: Check .app size**

```bash
du -sh ui/src-tauri/target/release/bundle/macos/VideoSearch.app
```

Expected: ~200-250MB (down from ~715MB).

- [ ] **Step 5: Create DMG**

```bash
hdiutil create -volname VideoSearch \
  -srcfolder ui/src-tauri/target/release/bundle/macos/VideoSearch.app \
  -ov -format UDZO VideoSearch_0.1.0_aarch64.dmg
du -sh VideoSearch_0.1.0_aarch64.dmg
```

Expected: ~80-100MB (down from ~279MB).

- [ ] **Step 6: Launch and test the .app**

```bash
open ui/src-tauri/target/release/bundle/macos/VideoSearch.app
sleep 8
curl -s "http://127.0.0.1:8008/api/library"
```

Expected: App launches, sidecar starts, API responds.

- [ ] **Step 7: Commit and push**

```bash
git add -A
git commit -m "feat: complete ONNX Runtime migration — app size reduced ~70%"
git push origin feat/desktop-app
```
