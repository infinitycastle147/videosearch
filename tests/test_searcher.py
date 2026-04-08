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
    # Create 4 embeddings; make embedding[1] closest to query
    query_dir = np.array([1.0, 0.0, 0.0] + [0.0] * 509, dtype=np.float32)
    embeddings = np.array([
        _unit_vec(np.array([0.1, 1.0] + [0.0] * 510, dtype=np.float32)),  # low score
        _unit_vec(np.array([1.0, 0.1] + [0.0] * 510, dtype=np.float32)),  # high score
        _unit_vec(np.array([0.5, 0.5] + [0.0] * 510, dtype=np.float32)),  # mid score
        _unit_vec(np.array([0.2, 0.8] + [0.0] * 510, dtype=np.float32)),  # low-mid score
    ])
    metadata = [
        {"file": "a.mp4", "mtime": 1, "timestamp_sec": 0, "timestamp_str": "0:00"},
        {"file": "b.mp4", "mtime": 2, "timestamp_sec": 5, "timestamp_str": "0:05"},
        {"file": "c.mp4", "mtime": 3, "timestamp_sec": 0, "timestamp_str": "0:00"},
        {"file": "d.mp4", "mtime": 4, "timestamp_sec": 0, "timestamp_str": "0:00"},
    ]
    _make_index(tmp_path, embeddings, metadata)

    query_emb = _unit_vec(query_dir)

    with patch("videosearch.searcher.load_model") as mock_load, \
         patch("videosearch.searcher.open_clip.get_tokenizer") as mock_tok:

        mock_model = MagicMock()
        mock_model.encode_text.return_value = \
            __import__("torch").tensor(query_emb).unsqueeze(0)
        mock_load.return_value = (mock_model, MagicMock())
        mock_tok.return_value = MagicMock(return_value=MagicMock())

        results = search(tmp_path, "test query", top_k=2, threshold=0.0)

    assert len(results) == 2
    assert results[0]["file"] == "b.mp4"  # highest cosine similarity
    assert results[0]["score"] > results[1]["score"]


def test_search_filters_by_threshold(tmp_path):
    """search excludes results below threshold."""
    query_dir = np.array([1.0] + [0.0] * 511, dtype=np.float32)
    low_score_emb = _unit_vec(np.array([0.01] + [1.0] + [0.0] * 510, dtype=np.float32))
    embeddings = low_score_emb.reshape(1, 512)
    metadata = [{"file": "x.mp4", "mtime": 1, "timestamp_sec": 0, "timestamp_str": "0:00"}]
    _make_index(tmp_path, embeddings, metadata)

    import torch
    with patch("videosearch.searcher.load_model") as mock_load, \
         patch("videosearch.searcher.open_clip.get_tokenizer") as mock_tok:

        mock_model = MagicMock()
        mock_model.encode_text.return_value = torch.tensor(query_dir).unsqueeze(0)
        mock_load.return_value = (mock_model, MagicMock())
        mock_tok.return_value = MagicMock(return_value=MagicMock())

        results = search(tmp_path, "query", top_k=5, threshold=0.99)

    assert results == []


def test_search_raises_when_no_index(tmp_path):
    """search raises RuntimeError when index does not exist."""
    with pytest.raises(RuntimeError, match="No index found"):
        search(tmp_path, "anything")


def test_search_result_contains_required_keys(tmp_path):
    """Each result dict contains file, timestamp_str, timestamp_sec, score."""
    import torch
    query_dir = np.array([1.0] + [0.0] * 511, dtype=np.float32)
    emb = _unit_vec(np.array([1.0] + [0.1] + [0.0] * 510, dtype=np.float32))
    embeddings = emb.reshape(1, 512)
    metadata = [{"file": "v.mp4", "mtime": 1, "timestamp_sec": 10, "timestamp_str": "0:10"}]
    _make_index(tmp_path, embeddings, metadata)

    with patch("videosearch.searcher.load_model") as mock_load, \
         patch("videosearch.searcher.open_clip.get_tokenizer") as mock_tok:

        mock_model = MagicMock()
        mock_model.encode_text.return_value = torch.tensor(query_dir).unsqueeze(0)
        mock_load.return_value = (mock_model, MagicMock())
        mock_tok.return_value = MagicMock(return_value=MagicMock())

        results = search(tmp_path, "test", top_k=1, threshold=0.0)

    assert len(results) == 1
    r = results[0]
    assert r["file"] == "v.mp4"
    assert r["timestamp_str"] == "0:10"
    assert r["timestamp_sec"] == 10
    assert isinstance(r["score"], float)
