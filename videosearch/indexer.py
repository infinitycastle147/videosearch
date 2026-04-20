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
SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov"}
SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tiff"}
SUPPORTED_EXTENSIONS = SUPPORTED_VIDEO_EXTENSIONS | SUPPORTED_IMAGE_EXTENSIONS

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
    """Build or update the search index for all media in video_dir.

    Indexes both videos (frame sampling) and images (single embedding).
    Skips files already indexed with the same mtime.
    Replaces entries for files whose mtime has changed.
    """
    session = load_image_session()
    embeddings, metadata = load_index(video_dir)

    indexed_keys = {(m["file"], m["mtime"]) for m in metadata}

    new_embeddings: list[np.ndarray] = []
    new_metadata: list[dict] = []

    for file_path in sorted(video_dir.iterdir()):
        ext = file_path.suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            continue

        mtime = int(file_path.stat().st_mtime)
        file_key = file_path.name

        if (file_key, mtime) in indexed_keys:
            continue

        keep_indices = [i for i, m in enumerate(metadata) if m["file"] != file_key]
        metadata = [metadata[i] for i in keep_indices]
        if len(embeddings) > 0 and len(keep_indices) < len(embeddings):
            embeddings = embeddings[keep_indices] if keep_indices else np.zeros((0, 512), dtype=np.float32)

        if ext in SUPPORTED_IMAGE_EXTENSIONS:
            print(f"Indexing image {file_key}...")
            try:
                emb = embed_frame(session, file_path)
                new_embeddings.append(emb)
                new_metadata.append({
                    "file": file_key,
                    "mtime": mtime,
                    "timestamp_sec": 0,
                    "timestamp_str": "image",
                    "type": "image",
                })
            except Exception as e:
                print(f"  Warning: skipping {file_key}: {e}")
                continue
        else:
            print(f"Indexing {file_key}...")
            try:
                for frame_path, timestamp_sec in extract_frames(file_path, interval):
                    emb = embed_frame(session, frame_path)
                    new_embeddings.append(emb)
                    minutes, seconds = divmod(timestamp_sec, 60)
                    new_metadata.append({
                        "file": file_key,
                        "mtime": mtime,
                        "timestamp_sec": timestamp_sec,
                        "timestamp_str": f"{minutes}:{seconds:02d}",
                        "type": "video",
                    })
            except RuntimeError as e:
                print(f"  Warning: skipping {file_key}: {e}")
                continue

    if new_embeddings:
        new_arr = np.stack(new_embeddings).astype(np.float32)
        embeddings = np.concatenate([embeddings, new_arr]) if len(embeddings) > 0 else new_arr
        metadata = metadata + new_metadata

    save_index(video_dir, embeddings, metadata)
    print(f"Index complete: {len(metadata)} items indexed.")
