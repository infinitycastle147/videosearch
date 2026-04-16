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
