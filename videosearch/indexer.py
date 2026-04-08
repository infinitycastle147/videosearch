import json
from pathlib import Path

import numpy as np
import open_clip
import torch
from PIL import Image

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
