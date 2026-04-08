import subprocess
import tempfile
from pathlib import Path
from typing import Iterator


def _run_ffmpeg(video_path: Path, output_dir: Path, interval: int) -> None:
    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vf", f"fps=1/{interval}",
        "-q:v", "2",
        str(output_dir / "frame_%04d.jpg"),
        "-loglevel", "error",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed for {video_path}: {result.stderr}")


def extract_frames(video_path: Path, interval: int = 5) -> Iterator[tuple[Path, int]]:
    """Extract frames from a video at the given interval.

    Yields (frame_path, timestamp_sec) for each extracted frame.
    Frames are deleted when the iterator is exhausted.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        _run_ffmpeg(video_path, tmpdir, interval)
        frames = sorted(tmpdir.glob("frame_*.jpg"))
        for i, frame_path in enumerate(frames):
            yield frame_path, i * interval
