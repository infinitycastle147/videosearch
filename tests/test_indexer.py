import numpy as np
import pytest
from pathlib import Path

from videosearch.indexer import save_index, load_index, INDEX_DIR


def test_save_and_load_roundtrip(tmp_path):
    """Embeddings and metadata survive a save/load cycle."""
    embeddings = np.random.randn(4, 512).astype(np.float32)
    metadata = [
        {"file": "a.mp4", "mtime": 1000, "timestamp_sec": 0, "timestamp_str": "0:00"},
        {"file": "a.mp4", "mtime": 1000, "timestamp_sec": 5, "timestamp_str": "0:05"},
        {"file": "b.mp4", "mtime": 2000, "timestamp_sec": 0, "timestamp_str": "0:00"},
        {"file": "b.mp4", "mtime": 2000, "timestamp_sec": 5, "timestamp_str": "0:05"},
    ]

    save_index(tmp_path, embeddings, metadata)
    loaded_emb, loaded_meta = load_index(tmp_path)

    np.testing.assert_array_almost_equal(embeddings, loaded_emb)
    assert loaded_meta == metadata


def test_load_index_returns_empty_when_missing(tmp_path):
    """load_index returns empty arrays when no index exists."""
    embeddings, metadata = load_index(tmp_path)
    assert embeddings.shape == (0, 512)
    assert metadata == []


def test_save_index_creates_directory(tmp_path):
    """save_index creates the .videosearch subdirectory if absent."""
    embeddings = np.zeros((1, 512), dtype=np.float32)
    metadata = [{"file": "x.mp4", "mtime": 1, "timestamp_sec": 0, "timestamp_str": "0:00"}]

    save_index(tmp_path, embeddings, metadata)

    assert (tmp_path / INDEX_DIR).is_dir()
    assert (tmp_path / INDEX_DIR / "embeddings.npy").exists()
    assert (tmp_path / INDEX_DIR / "metadata.json").exists()


def test_embed_frame_returns_normalized_vector(tmp_path):
    """embed_frame returns a 512-dim L2-normalized float32 vector."""
    from videosearch.indexer import load_model, embed_frame
    from PIL import Image

    # Create a tiny fake JPEG
    frame_path = tmp_path / "frame.jpg"
    Image.new("RGB", (224, 224), color=(128, 64, 32)).save(frame_path)

    model, preprocess = load_model()
    emb = embed_frame(model, preprocess, frame_path)

    assert emb.shape == (512,)
    assert emb.dtype == np.float32
    norm = np.linalg.norm(emb)
    assert abs(norm - 1.0) < 1e-5, f"Expected unit vector, got norm={norm}"
