"""FastAPI server wrapping the videosearch package for the desktop app."""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


def _get_base_dir() -> Path:
    """Return the base directory of this application (handles PyInstaller bundle)."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent


def _find_ffmpeg(name: str = "ffmpeg") -> str:
    """Find ffmpeg/ffprobe: check bundled location first, then system PATH."""
    # Check next to the executable (Tauri resources or PyInstaller dist)
    base = _get_base_dir()
    bundled = base / name
    if bundled.exists() and os.access(str(bundled), os.X_OK):
        return str(bundled)
    # Check sibling of the executable directory
    if getattr(sys, "frozen", False):
        exe_dir = Path(sys.executable).parent
        sibling = exe_dir / name
        if sibling.exists() and os.access(str(sibling), os.X_OK):
            return str(sibling)
    # Fall back to system PATH
    found = shutil.which(name)
    if found:
        return found
    return name  # let subprocess raise an error if not found

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from videosearch.indexer import (
    SUPPORTED_EXTENSIONS,
    INDEX_DIR,
    build_index,
    load_index,
)
from videosearch.searcher import search

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track which directories have been indexed
LIBRARY_FILE = Path.home() / ".videosearch" / "library.json"
THUMBNAIL_DIR_NAME = "thumbnails"


def _load_library() -> list[dict]:
    if LIBRARY_FILE.exists():
        return json.loads(LIBRARY_FILE.read_text())
    return []


def _save_library(folders: list[dict]) -> None:
    LIBRARY_FILE.parent.mkdir(parents=True, exist_ok=True)
    LIBRARY_FILE.write_text(json.dumps(folders, indent=2))


def _extract_thumbnail(video_path: Path, output_path: Path) -> None:
    """Extract a single frame at 25% of video duration as thumbnail."""
    ffprobe_bin = _find_ffmpeg("ffprobe")
    ffmpeg_bin = _find_ffmpeg("ffmpeg")
    # Get duration
    probe = subprocess.run(
        [
            ffprobe_bin,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            str(video_path),
        ],
        capture_output=True,
        text=True,
    )
    try:
        duration = float(probe.stdout.strip())
        seek_time = duration * 0.25
    except (ValueError, TypeError):
        seek_time = 1.0

    output_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            ffmpeg_bin,
            "-loglevel",
            "error",
            "-ss",
            str(seek_time),
            "-i",
            str(video_path),
            "-vframes",
            "1",
            "-q:v",
            "5",
            "-vf",
            "scale=144:-1",
            "-y",
            str(output_path),
        ],
        capture_output=True,
    )


def _generate_thumbnails(video_dir: Path) -> None:
    """Generate thumbnails for all videos that don't have one yet."""
    thumb_dir = video_dir / INDEX_DIR / THUMBNAIL_DIR_NAME
    thumb_dir.mkdir(parents=True, exist_ok=True)
    for video_path in sorted(video_dir.iterdir()):
        if video_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        thumb_path = thumb_dir / f"{video_path.stem}.jpg"
        if not thumb_path.exists():
            _extract_thumbnail(video_path, thumb_path)


def _count_videos(directory: Path) -> int:
    return sum(
        1
        for f in directory.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def _find_video_dir_for_file(filename: str) -> Path | None:
    """Find which indexed directory contains the given video file."""
    for folder in _load_library():
        video_dir = Path(folder["path"])
        candidate = video_dir / filename
        if candidate.exists():
            return video_dir
    return None


class IndexRequest(BaseModel):
    paths: list[str]


@app.post("/api/index")
def index_videos(req: IndexRequest):
    indexed = 0
    skipped = 0
    dirs_to_index: set[Path] = set()

    for path_str in req.paths:
        p = Path(path_str)
        if p.is_dir():
            dirs_to_index.add(p)
        elif p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS:
            dirs_to_index.add(p.parent)
        else:
            skipped += 1

    for video_dir in dirs_to_index:
        n_before = len(load_index(video_dir)[1])
        build_index(video_dir)
        n_after = len(load_index(video_dir)[1])
        indexed += max(0, n_after - n_before)
        _generate_thumbnails(video_dir)

        # Update library
        library = _load_library()
        existing_paths = {f["path"] for f in library}
        dir_str = str(video_dir)
        if dir_str not in existing_paths:
            library.append({"path": dir_str})
            _save_library(library)

    total = sum(_count_videos(Path(f["path"])) for f in _load_library())
    return {"indexed": indexed, "skipped": skipped, "total": total}


@app.get("/api/search")
def search_videos(
    q: str = Query(...),
    top_k: int = Query(10),
    threshold: float = Query(0.2),
):
    all_results = []
    for folder in _load_library():
        video_dir = Path(folder["path"])
        if not video_dir.exists():
            continue
        try:
            results = search(video_dir, q, top_k=top_k, threshold=threshold)
            # Add the video_dir so we can resolve paths later
            for r in results:
                r["video_dir"] = str(video_dir)
            all_results.extend(results)
        except RuntimeError:
            continue

    # Re-sort by best_score and limit to top_k
    all_results.sort(key=lambda r: r["best_score"], reverse=True)
    return all_results[:top_k]


@app.get("/api/library")
def get_library():
    library = _load_library()
    result = []
    for folder in library:
        p = Path(folder["path"])
        if p.exists():
            result.append(
                {"path": folder["path"], "video_count": _count_videos(p)}
            )
    return result


@app.delete("/api/library")
def remove_from_library(path: str = Query(...)):
    library = _load_library()
    library = [f for f in library if f["path"] != path]
    _save_library(library)
    return {"ok": True}


@app.get("/api/thumbnail/{filename}")
def get_thumbnail(filename: str):
    stem = Path(filename).stem
    for folder in _load_library():
        thumb_path = (
            Path(folder["path"]) / INDEX_DIR / THUMBNAIL_DIR_NAME / f"{stem}.jpg"
        )
        if thumb_path.exists():
            return FileResponse(thumb_path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Thumbnail not found")


@app.get("/api/video")
def get_video(path: str = Query(...), dir: str | None = Query(None)):
    """Serve video file. The 'path' param is the filename."""
    if dir:
        video_dir = Path(dir)
        if not (video_dir / path).exists():
            video_dir = _find_video_dir_for_file(path)
    else:
        video_dir = _find_video_dir_for_file(path)
    if video_dir is None:
        raise HTTPException(status_code=404, detail="Video not found")

    video_path = video_dir / path
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=path,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8008)
