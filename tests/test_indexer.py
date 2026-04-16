import numpy as np
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

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
