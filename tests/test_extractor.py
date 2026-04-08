import subprocess
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from videosearch.extractor import extract_frames


def _make_fake_frames(tmpdir: Path, count: int):
    """Helper: create fake JPEG files named frame_0001.jpg etc."""
    for i in range(1, count + 1):
        (tmpdir / f"frame_{i:04d}.jpg").write_bytes(b"fake")


def test_extract_frames_calls_ffmpeg(tmp_path):
    """extract_frames calls ffmpeg with fps=1/interval filter."""
    video = tmp_path / "video.mp4"
    video.write_bytes(b"fake")

    with patch("videosearch.extractor._run_ffmpeg") as mock_ffmpeg, \
         patch("videosearch.extractor.tempfile.TemporaryDirectory") as mock_tmpdir:

        mock_ctx = MagicMock()
        mock_ctx.__enter__ = lambda s: str(tmp_path / "frames")
        mock_ctx.__exit__ = MagicMock(return_value=False)
        mock_tmpdir.return_value = mock_ctx

        frames_dir = tmp_path / "frames"
        frames_dir.mkdir()
        _make_fake_frames(frames_dir, 3)

        results = list(extract_frames(video, interval=5))

    mock_ffmpeg.assert_called_once_with(video, frames_dir, 5)
    assert len(results) == 3


def test_extract_frames_yields_correct_timestamps(tmp_path):
    """Timestamps increment by interval for each frame."""
    video = tmp_path / "video.mp4"
    video.write_bytes(b"fake")

    with patch("videosearch.extractor._run_ffmpeg"), \
         patch("videosearch.extractor.tempfile.TemporaryDirectory") as mock_tmpdir:

        mock_ctx = MagicMock()
        frames_dir = tmp_path / "frames"
        frames_dir.mkdir()
        mock_ctx.__enter__ = lambda s: str(frames_dir)
        mock_ctx.__exit__ = MagicMock(return_value=False)
        mock_tmpdir.return_value = mock_ctx

        _make_fake_frames(frames_dir, 3)
        results = list(extract_frames(video, interval=10))

    paths, timestamps = zip(*results)
    assert list(timestamps) == [0, 10, 20]


def test_run_ffmpeg_raises_on_failure(tmp_path):
    """_run_ffmpeg raises RuntimeError when ffmpeg exits non-zero."""
    from videosearch.extractor import _run_ffmpeg

    with patch("videosearch.extractor.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stderr="No such file")
        with pytest.raises(RuntimeError, match="ffmpeg failed"):
            _run_ffmpeg(tmp_path / "video.mp4", tmp_path, interval=5)


def test_run_ffmpeg_constructs_correct_command(tmp_path):
    """_run_ffmpeg passes fps=1/interval filter to ffmpeg."""
    from videosearch.extractor import _run_ffmpeg

    with patch("videosearch.extractor.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stderr="")
        _run_ffmpeg(tmp_path / "clip.mp4", tmp_path, interval=5)

    call_args = mock_run.call_args[0][0]
    assert "fps=1/5" in " ".join(call_args)
    assert str(tmp_path / "clip.mp4") in call_args
