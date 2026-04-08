import json
from pathlib import Path

import numpy as np

INDEX_DIR = ".videosearch"
EMBEDDINGS_FILE = "embeddings.npy"
METADATA_FILE = "metadata.json"
SUPPORTED_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov"}


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
