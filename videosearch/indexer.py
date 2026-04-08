import json
from pathlib import Path

import numpy as np
import open_clip
import torch
from PIL import Image

from .extractor import extract_frames

# Disable MKL-DNN globally: this host CPU lacks full AVX-512 support and
# triggers a SIGFPE inside oneDNN during CLIP inference.
torch.backends.mkldnn.enabled = False

INDEX_DIR = ".videosearch"
EMBEDDINGS_FILE = "embeddings.npy"
METADATA_FILE = "metadata.json"
SUPPORTED_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov"}


def load_model() -> tuple:
    """Load CLIP ViT-B/32 model and image preprocessor.

    Downloads weights on first call (~600MB), cached in ~/.cache afterwards.
    Returns (model, preprocess).
    """
    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-B-32", pretrained="openai"
    )
    model.eval()
    return model, preprocess


def embed_frame(model, preprocess, frame_path: Path) -> np.ndarray:
    """Encode a single image frame with CLIP.

    Returns a 512-dim L2-normalized float32 numpy vector.
    """
    image = preprocess(Image.open(frame_path)).unsqueeze(0)
    with torch.no_grad():
        features = model.encode_image(image)
        features = features / features.norm(dim=-1, keepdim=True)
    return features.squeeze(0).numpy().astype(np.float32)


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
    model, preprocess = load_model()
    embeddings, metadata = load_index(video_dir)

    # Build lookup of already-indexed (filename, mtime) pairs
    indexed_keys = {(m["file"], m["mtime"]) for m in metadata}

    new_embeddings: list[np.ndarray] = []
    new_metadata: list[dict] = []

    for video_path in sorted(video_dir.iterdir()):
        if video_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        mtime = int(video_path.stat().st_mtime)
        file_key = video_path.name

        if (file_key, mtime) in indexed_keys:
            continue  # unchanged — skip

        # Remove stale entries for this file (re-indexing after change)
        keep_indices = [i for i, m in enumerate(metadata) if m["file"] != file_key]
        metadata = [metadata[i] for i in keep_indices]
        if len(embeddings) > 0 and len(keep_indices) < len(embeddings):
            embeddings = embeddings[keep_indices] if keep_indices else np.zeros((0, 512), dtype=np.float32)

        print(f"Indexing {file_key}...")
        try:
            for frame_path, timestamp_sec in extract_frames(video_path, interval):
                emb = embed_frame(model, preprocess, frame_path)
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
