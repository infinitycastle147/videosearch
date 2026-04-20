# VideoSearch

Google for your videos — search your local video library using plain English. Type "dog running in the park" and it finds the exact moments across all your videos that match, ranked by similarity with timestamps.

No cloud. No API keys. Runs entirely on your machine.

---

## Download

Grab the latest release for your OS:

**[Download from GitHub Releases](https://github.com/infinitycastle147/videosearch/releases/latest)**

| Platform | File | Notes |
|---|---|---|
| macOS (Apple Silicon) | `VideoSearch_x.x.x_aarch64.dmg` | M1/M2/M3/M4 Macs |
| Windows | `VideoSearch_x.x.x_x64-setup.exe` | Windows 10+ |
| Linux (Debian/Ubuntu) | `video-search_x.x.x_amd64.deb` | `sudo dpkg -i <file>.deb` |

### First-time setup

1. **Install ffmpeg** (required for extracting video frames):
   - macOS: `brew install ffmpeg`
   - Windows: `winget install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Linux: `sudo apt install ffmpeg` (or your distro's package manager)

2. **macOS Gatekeeper**: The app is unsigned. Right-click the app > "Open" > click "Open" in the dialog to bypass Gatekeeper.

3. Open VideoSearch, select a folder with videos, and click "Index". Once indexed, type any search query.

---

## How it works

Videos are sliced into frames (1 frame every 5 seconds by default). Each frame is encoded into a 512-dimensional vector using [CLIP ViT-B/32](https://github.com/openai/CLIP) via ONNX Runtime. The vectors are stored in a flat `.npy` file alongside JSON metadata.

When you search, your query is encoded by the same CLIP text encoder. Cosine similarity is computed between the query vector and every stored frame vector. Results are grouped by video, ranked by best matching score.

```
Videos on disk
    -> ffmpeg extracts 1 frame every 5s
    -> CLIP image encoder (ONNX) -> 512-dim vector per frame
    -> saved to .videosearch/embeddings.npy + metadata.json

Search query
    -> CLIP text encoder (ONNX) -> 512-dim query vector
    -> cosine similarity against all frame vectors
    -> results grouped by video, ranked by best score
```

---

## CLI usage

VideoSearch also works as a command-line tool.

### Installation (CLI)

```bash
git clone https://github.com/infinitycastle147/videosearch.git
cd videosearch
python -m venv venv && source venv/bin/activate
pip install -e .
```

You also need the ONNX models. Either export them yourself (requires PyTorch):

```bash
pip install torch open_clip_torch onnx
python scripts/export_onnx.py
```

Or download them from a release and place in `models/`.

### Index your videos

```bash
videosearch index ~/Videos
```

This scans for `.mp4`, `.mkv`, `.avi`, `.mov` files, extracts frames with ffmpeg, and saves the index. Re-run anytime — only new or changed files are re-indexed.

### Search

```bash
videosearch search ~/Videos "dog running in the park"
```

**Example output:**

```
Results for: "dog running in the park"

 1. park_trip.mp4  (best: 0.91)
      @ 0:42  (score: 0.91)
      @ 1:15  (score: 0.85)
 2. summer_vacation.mp4  (best: 0.87)
      @ 3:15  (score: 0.87)
```

### Options

| Command | Flag | Default | Description |
|---------|------|---------|-------------|
| `index` | `--interval N` | `5` | Seconds between sampled frames |
| `search` | `--top-k N` | `5` | Number of video results to return |
| `search` | `--threshold F` | `0.2` | Minimum similarity score (0-1) |

### Docker

```bash
docker build -t videosearch .
VIDEO_DIR=~/Videos docker-compose run videosearch index /videos
VIDEO_DIR=~/Videos docker-compose run videosearch search /videos "sunset over ocean"
```

---

## RAM usage

| Scenario | Approximate RAM |
|---|---|
| ONNX model loaded (CLIP ViT-B/32) | ~400 MB |
| Index for 1 hour of video (at 5s interval) | ~1.4 MB |
| Index for 10 hours of video | ~14 MB |
| Index for 100 hours of video | ~140 MB |

**Formula:** `N_clips x 512 dims x 4 bytes`

Minimum recommended: 2 GB RAM.

---

## Architecture

```
videosearch/
├── videosearch/
│   ├── extractor.py       # ffmpeg wrapper — extracts frames as JPEGs
│   ├── indexer.py          # ONNX image encoder, frame embedding, index I/O
│   ├── searcher.py         # ONNX text encoder, cosine similarity search
│   ├── clip_tokenizer.py   # Pure-Python BPE tokenizer for CLIP
│   └── cli.py              # Click CLI — index and search subcommands
├── api.py                  # FastAPI server (desktop app backend)
├── ui/                     # Tauri 2 + React + TypeScript frontend
├── models/                 # ONNX model files (not in git)
├── scripts/
│   ├── export_onnx.py      # One-time CLIP -> ONNX export script
│   └── build-sidecar.sh    # PyInstaller build for desktop app
├── tests/                  # 27 unit tests (pytest)
├── .github/workflows/      # CI/CD: cross-platform release builds
├── Dockerfile
├── docker-compose.yml
└── pyproject.toml
```

**Desktop app stack:** Tauri 2 (Rust shell + native webview) + React + Tailwind CSS v4. The Python backend runs as a PyInstaller sidecar process.

---

## Supported formats

`.mp4` `.mkv` `.avi` `.mov`

---

## Building from source

### Desktop app

```bash
# 1. Export ONNX models (one-time, requires PyTorch)
pip install torch open_clip_torch onnx onnxruntime
python scripts/export_onnx.py

# 2. Build PyInstaller sidecar
./scripts/build-sidecar.sh

# 3. Build Tauri app
cd ui && npm install && npm run tauri build
```

### Running tests

```bash
pip install -e ".[dev]"
pytest -v
```

---

## License

MIT
