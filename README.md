# videosearch

A local CLI tool that lets you search your video library using plain English. Type "dog running in the park" and it finds the exact moments across all your videos that match — ranked by similarity with timestamps.

No cloud. No API keys. Runs entirely on your machine.

---

## How it works

Videos are too long to embed as a whole, so the tool slices each one into frames (1 frame every 5 seconds by default). Each frame is encoded into a 512-dimensional vector using [CLIP](https://github.com/mlfoundations/open_clip) (ViT-B/32), a model that maps both images and text into the same embedding space. The vectors are stored in a flat `.npy` file alongside a JSON metadata file.

When you search, your query is encoded by the same CLIP text encoder. Cosine similarity is computed between the query vector and every stored frame vector. The closest matches are returned with filenames, timestamps, and scores.

```
Videos on disk
    → ffmpeg extracts 1 frame every 5s
    → CLIP image encoder → 512-dim vector per frame
    → saved to .videosearch/embeddings.npy + metadata.json

Search query
    → CLIP text encoder → 512-dim query vector
    → cosine similarity against all frame vectors
    → top-K results ranked by score
```

---

## Requirements

- Python 3.10+
- `ffmpeg` installed on your system
- ~600 MB disk space for CLIP model weights (downloaded once, cached)
- RAM: see [RAM usage](#ram-usage)

---

## Installation

### Local (pip)

```bash
git clone https://github.com/infinitycastle147/videosearch.git
cd videosearch
pip install -e .
```

### Docker (no Python/ffmpeg setup needed)

```bash
git clone https://github.com/infinitycastle147/videosearch.git
cd videosearch
docker build -t videosearch .
```

CLIP model weights are downloaded on the first run and cached in a named Docker volume so subsequent runs are instant.

---

## Usage

### Step 1 — Index your videos

```bash
# Local
videosearch index ~/Videos

# Docker
VIDEO_DIR=~/Videos docker-compose run videosearch index /videos
```

This scans the folder for `.mp4`, `.mkv`, `.avi`, `.mov` files, extracts frames with ffmpeg, encodes each frame with CLIP, and saves the index to `~/Videos/.videosearch/`.

Re-run anytime — only new or changed files are re-indexed (incremental, based on file modification time).

### Step 2 — Search

```bash
# Local
videosearch search ~/Videos "dog running in the park"

# Docker
VIDEO_DIR=~/Videos docker-compose run videosearch search /videos "dog running in the park"
```

**Example output:**

```
Results for: "dog running in the park"

 1. park_trip.mp4                         @ 0:42  (score: 0.91)
 2. summer_vacation.mp4                   @ 3:15  (score: 0.87)
 3. backyard_bbq.mp4                      @ 1:10  (score: 0.74)
```

### Options

| Command | Flag | Default | Description |
|---------|------|---------|-------------|
| `index` | `--interval N` | `5` | Seconds between sampled frames |
| `search` | `--top-k N` | `5` | Number of results to return |
| `search` | `--threshold F` | `0.2` | Minimum similarity score (0–1) |

```bash
# Sample more densely (every 2 seconds) for higher precision
videosearch index ~/Videos --interval 2

# Return top 10 results with a stricter threshold
videosearch search ~/Videos "sunset over ocean" --top-k 10 --threshold 0.3
```

---

## RAM usage

| Scenario | Approximate RAM |
|---|---|
| CLIP model loaded (ViT-B/32) | ~600 MB |
| Index for 1 hour of video (at 5s interval) | ~14 MB |
| Index for 10 hours of video | ~140 MB |
| Index for 100 hours of video | ~1.4 GB |

**Formula:** `N_clips × 512 dims × 4 bytes`

- 1 hour at 5s interval = 720 clips → 720 × 512 × 4 = ~1.4 MB per hour of video
- The full index is loaded into RAM on every search

For typical home video libraries (tens to low hundreds of files), RAM usage from the index itself is negligible. The CLIP model dominates at ~600 MB.

**Minimum recommended:** 2 GB RAM (model + index + OS headroom)

---

## Index storage

The index lives at `<your-video-dir>/.videosearch/`:

```
.videosearch/
├── embeddings.npy   # Float32 array, shape (N_clips, 512)
└── metadata.json    # [{file, timestamp_sec, timestamp_str, mtime}, ...]
```

You can delete this folder at any time to start fresh. Re-run `videosearch index` to rebuild.

---

## Supported formats

`.mp4` · `.mkv` · `.avi` · `.mov`

---

## Limitations

- **Text queries only** — image or audio queries are not supported
- **No scene understanding** — similarity is frame-level, not semantic scene-level
- **Deleted videos stay in the index** — if you delete a video, re-index the folder to rebuild from scratch (incremental indexing only adds, never prunes)
- **First run is slow** — CLIP weights (~600 MB) are downloaded automatically on first use
- **CPU inference** — no GPU acceleration in the current setup; indexing is slow for large libraries

---

## Project structure

```
videosearch/
├── videosearch/
│   ├── extractor.py   # ffmpeg wrapper — extracts frames as JPEGs
│   ├── indexer.py     # CLIP model, frame embedding, index save/load/build
│   ├── searcher.py    # Text query encoding, cosine similarity search
│   └── cli.py         # Click CLI — index and search subcommands
├── tests/             # 21 unit tests (pytest)
├── Dockerfile
├── docker-compose.yml
└── pyproject.toml
```

---

## Running tests

```bash
pip install -e ".[dev]"
pytest -v
```

---

## License

MIT
