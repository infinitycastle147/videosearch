import numpy as np
import pytest
from pathlib import Path

from videosearch.indexer import save_index
from videosearch.duplicates import find_duplicates


def _unit_vec(v: np.ndarray) -> np.ndarray:
    return (v / np.linalg.norm(v)).astype(np.float32)


def test_finds_duplicate_pair(tmp_path):
    """Two files with nearly identical embeddings are flagged as duplicates."""
    base = np.array([1.0, 0.0] + [0.0] * 510, dtype=np.float32)
    # Tiny perturbation — cosine similarity ~0.9999
    perturbed = base.copy()
    perturbed[1] = 0.01

    embeddings = np.array([_unit_vec(base), _unit_vec(perturbed)])
    metadata = [
        {"file": "a.jpg", "mtime": 1, "timestamp_sec": 0, "timestamp_str": "image", "type": "image"},
        {"file": "b.jpg", "mtime": 2, "timestamp_sec": 0, "timestamp_str": "image", "type": "image"},
    ]
    save_index(tmp_path, embeddings, metadata)

    groups = find_duplicates(tmp_path, similarity_threshold=0.95)
    assert len(groups) == 1
    assert set(groups[0]["files"]) == {"a.jpg", "b.jpg"}
    assert groups[0]["similarity"] > 0.99


def test_no_duplicates_when_different(tmp_path):
    """Two files with very different embeddings are not flagged."""
    emb1 = _unit_vec(np.array([1.0, 0.0] + [0.0] * 510, dtype=np.float32))
    emb2 = _unit_vec(np.array([0.0, 1.0] + [0.0] * 510, dtype=np.float32))

    embeddings = np.array([emb1, emb2])
    metadata = [
        {"file": "cat.jpg", "mtime": 1, "timestamp_sec": 0, "timestamp_str": "image", "type": "image"},
        {"file": "mountain.jpg", "mtime": 2, "timestamp_sec": 0, "timestamp_str": "image", "type": "image"},
    ]
    save_index(tmp_path, embeddings, metadata)

    groups = find_duplicates(tmp_path, similarity_threshold=0.95)
    assert groups == []


def test_empty_index_returns_empty(tmp_path):
    """No index returns empty list."""
    groups = find_duplicates(tmp_path)
    assert groups == []


def test_single_file_returns_empty(tmp_path):
    """A single file cannot be a duplicate of anything."""
    emb = _unit_vec(np.array([1.0] + [0.0] * 511, dtype=np.float32))
    embeddings = emb.reshape(1, 512)
    metadata = [{"file": "only.mp4", "mtime": 1, "timestamp_sec": 0, "timestamp_str": "0:00", "type": "video"}]
    save_index(tmp_path, embeddings, metadata)

    groups = find_duplicates(tmp_path)
    assert groups == []


def test_groups_multiple_duplicates(tmp_path):
    """Three near-identical files form a single group."""
    base = np.array([1.0, 0.5] + [0.0] * 510, dtype=np.float32)
    embeddings = np.array([
        _unit_vec(base),
        _unit_vec(base + np.array([0.0, 0.001] + [0.0] * 510, dtype=np.float32)),
        _unit_vec(base + np.array([0.001, 0.0] + [0.0] * 510, dtype=np.float32)),
    ])
    metadata = [
        {"file": "copy1.jpg", "mtime": 1, "timestamp_sec": 0, "timestamp_str": "image", "type": "image"},
        {"file": "copy2.jpg", "mtime": 2, "timestamp_sec": 0, "timestamp_str": "image", "type": "image"},
        {"file": "copy3.jpg", "mtime": 3, "timestamp_sec": 0, "timestamp_str": "image", "type": "image"},
    ]
    save_index(tmp_path, embeddings, metadata)

    groups = find_duplicates(tmp_path, similarity_threshold=0.95)
    assert len(groups) == 1
    assert len(groups[0]["files"]) == 3
