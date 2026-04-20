import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterator


def _find_ffmpeg() -> str:
    """Find ffmpeg binary: check bundled location first, then system PATH."""
    name = "ffmpeg.exe" if sys.platform == "win32" else "ffmpeg"
    if getattr(sys, "frozen", False):
        # PyInstaller bundle: check next to executable
        exe_dir = Path(sys.executable).parent
        bundled = exe_dir / name
        if bundled.exists() and os.access(str(bundled), os.X_OK):
            return str(bundled)
        # Check _MEIPASS
        bundled = Path(sys._MEIPASS) / name
        if bundled.exists() and os.access(str(bundled), os.X_OK):
            return str(bundled)
    found = shutil.which("ffmpeg")
    if found:
        return found
    return "ffmpeg"


def _run_ffmpeg(video_path: Path, output_dir: Path, interval: int) -> None:
    """Run ffmpeg to extract one frame per `interval` seconds as JPEGs.

    Frames are written to output_dir as frame_0001.jpg, frame_0002.jpg, etc.
    Raises RuntimeError if ffmpeg exits with a non-zero return code.
    """
    if interval <= 0:
        raise ValueError(f"interval must be a positive integer, got {interval!r}")
    ffmpeg_bin = _find_ffmpeg()
    cmd = [
        ffmpeg_bin, "-loglevel", "error",
        "-i", str(video_path),
        "-vf", f"fps=1/{interval}",
        "-q:v", "2",
        str(output_dir / "frame_%04d.jpg"),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed for {video_path}: {result.stderr}")


def extract_frames(video_path: Path, interval: int = 5) -> Iterator[tuple[Path, int]]:
    """Extract frames from a video at the given interval.

    Yields (frame_path, timestamp_sec) for each extracted frame.
    Frame files are stored in a temporary directory and deleted when the
    generator is exhausted or closed. Callers MUST process each frame
    within the loop body — collecting paths with list() and using them
    later will result in FileNotFoundError because the tempdir is gone.

    Correct usage:
        for frame_path, ts in extract_frames(video, interval=5):
            process(frame_path)  # must happen here

    Incorrect (paths will be dead after loop):
        frames = list(extract_frames(video))  # DO NOT DO THIS
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        _run_ffmpeg(video_path, tmpdir, interval)
        frames = sorted(tmpdir.glob("frame_*.jpg"))
        for i, frame_path in enumerate(frames):
            yield frame_path, i * interval
