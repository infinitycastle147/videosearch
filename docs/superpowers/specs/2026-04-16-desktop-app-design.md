# VideoSearch Desktop App — Design Spec

## Overview

Build a native desktop application for VideoSearch using **Tauri 2 + React** frontend with the existing **Python CLIP backend** running as a FastAPI sidecar. The app lets general consumers search their local video library using natural language — "Google for my videos" that's fully local and private.

## Target User

General consumers with videos scattered across their laptop. They want to find specific moments without scrubbing through every file. Privacy-conscious — everything runs locally with no cloud dependency.

## Tech Stack

- **Shell**: Tauri 2 (Rust, native webview — no Chromium)
- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS with custom glassmorphism theme
- **Backend**: FastAPI (Python) — wraps existing `videosearch` package
- **Bundling**: Tauri's built-in bundler (`.app` for Mac, `.exe`/`.msi` for Windows)
- **Video player**: HTML5 `<video>` element

## Architecture

```
┌──────────────────────────────────────────────┐
│                  Tauri Shell                  │
│  ┌────────────────────────────────────────┐   │
│  │         React Frontend (Webview)       │   │
│  │                                        │   │
│  │  Sidebar │ Results Panel │ Player      │   │
│  │          │               │ Panel       │   │
│  └──────────┼───────────────┼─────────────┘   │
│             │               │                 │
│     HTTP calls to localhost                   │
│             │               │                 │
│  ┌──────────▼───────────────▼─────────────┐   │
│  │       FastAPI Python Sidecar           │   │
│  │                                        │   │
│  │  /api/index   (POST) — index videos    │   │
│  │  /api/search  (GET)  — search query    │   │
│  │  /api/library (GET)  — list indexed    │   │
│  │  /api/thumbnail/:file (GET) — thumb    │   │
│  └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

Tauri launches the FastAPI server as a sidecar process on app startup. The React frontend communicates with it over `localhost`. On app close, Tauri kills the sidecar.

## Visual Design

### Color Theme: Cyan & Electric Blue

| Role            | Color     | Usage                                    |
|-----------------|-----------|------------------------------------------|
| Background base | `#0a0f1a` | Main app background                      |
| Background alt  | `#0c1929` | Sidebar, card backgrounds                |
| Primary         | `#22d3ee` | Search icon, active borders, UI accents  |
| Secondary       | `#3b82f6` | Gradients, progress bar, links           |
| Match marker    | `#f472b6` | Timestamp dots on seek bar               |
| Text primary    | `rgba(255,255,255,0.85)` | Headings, video names      |
| Text secondary  | `rgba(255,255,255,0.4)`  | Scores, paths, labels      |
| Glass panel     | `rgba(255,255,255,0.05)` with `border: 1px solid rgba(255,255,255,0.08)` and `backdrop-filter: blur(10px)` | Cards, panels |

### Style: Glassmorphism

- Dark base with frosted glass panels
- Subtle borders with low-opacity white
- Backdrop blur on overlapping elements
- Gradient accents (cyan → blue)
- Rounded corners (8-12px)
- Soft shadows and glows on interactive elements

## Layout: Sidebar + Split Main

### Three-column layout:

```
┌─────────┬──────────────┬───────────────────┐
│         │              │                   │
│ Sidebar │  Results     │   Video Player    │
│ (220px) │  Panel       │   Panel           │
│         │  (320px)     │   (flex)          │
│         │              │                   │
│         │              │                   │
└─────────┴──────────────┴───────────────────┘
```

### Sidebar (220px, fixed)

Top to bottom:
1. **App logo + name** — gradient icon (cyan→blue) + "VideoSearch" text
2. **Search bar** — glass-styled input with cyan search icon
3. **Drop zone** — dashed border area: "Drop videos or folders here"
4. **Library section** — label "Library · N videos", list of added folders with video count and green dot indicator
5. **Recent searches** — last 5 searches with clock icon, clickable to re-run
6. **Settings** — gear icon at bottom (threshold, interval settings)

### Results Panel (320px, scrollable)

- Header: `Results for "query" · N videos`
- List of result cards (see below)
- Empty state when no search yet: centered text "Search for something to get started"
- Loading state: skeleton cards with pulse animation

### Result Card

Each card is a horizontal row:
- **Thumbnail** (72×48px) — extracted from video at 25% mark, rounded corners
- **Video name** — truncated with ellipsis if too long
- **Score** — e.g., "Score: 0.87 · 3 matches"
- **Timestamp chips** — cyan pill badges (e.g., "0:42", "1:37"), clickable to jump player to that time
- **Selected state** — highlighted border + background in primary color

### Video Player Panel (flex, fills remaining space)

- **HTML5 `<video>` player** — dark rounded container
- **Seek bar** — cyan→blue gradient progress, with **pink dots** (#f472b6) at each matched timestamp position
- **Playback controls** — play/pause, skip back/forward
- **Video info below player**:
  - Video filename (bold)
  - Score + full file path (dimmed)
  - "Jump to:" followed by clickable timestamp buttons
- **Empty state** — centered play icon with "Select a result to play"

## Core Features

### 1. Drag & Drop Import

- User drags video files or folders onto the drop zone in the sidebar
- App filters to supported extensions (`.mp4`, `.mkv`, `.avi`, `.mov`), silently skips others
- Triggers indexing via FastAPI `/api/index` endpoint
- Shows toast notification: "Indexed 12 videos (3 files skipped)"
- Extracts one thumbnail per video at the 25% timestamp mark
- Indexing is incremental — only new/changed files are processed (existing behavior)

### 2. Search

- User types query in search bar, hits Enter
- Frontend calls `GET /api/search?q=...&top_k=10&threshold=0.2`
- Results displayed as grouped list cards (best score per video, all timestamps listed)
- Search is saved to recent searches list
- Debounced input — no search-as-you-type (CLIP encoding is too slow for that)

### 3. Video Playback

- Click a result card → loads video in player panel, seeks to best-match timestamp
- Click a timestamp chip → player seeks to that timestamp
- Match markers shown as pink dots on the seek bar
- Standard HTML5 video controls (play, pause, volume, fullscreen)

### 4. Thumbnails

- During indexing, extract one frame at the 25% mark of each video using ffmpeg
- Save as JPEG in `.videosearch/thumbnails/` directory (~30-50KB each)
- Served via `GET /api/thumbnail/:filename`
- Displayed in result cards (72×48px)

### 5. Library Management

- Sidebar shows list of indexed folders with video count
- No folder picker dialog — purely drag & drop
- Videos/folders can be removed from library (removes index entries)

## FastAPI Backend

Wraps the existing `videosearch` Python package. Endpoints:

### `POST /api/index`
- Body: `{ "paths": ["/path/to/folder/or/file", ...] }`
- Triggers `build_index()` for each path
- Extracts thumbnails for new videos
- Returns: `{ "indexed": 12, "skipped": 3, "total": 24 }`

### `GET /api/search?q=<query>&top_k=10&threshold=0.2`
- Calls existing `search()` function
- Returns grouped results with all timestamps per video

### `GET /api/library`
- Returns list of indexed folders and video counts

### `GET /api/thumbnail/<filename>`
- Serves thumbnail JPEG from `.videosearch/thumbnails/`

### Video file access
- Videos are served via Tauri's `asset://` protocol (direct filesystem access from webview)
- No need to proxy through FastAPI — more efficient for large files and supports range requests natively

### `DELETE /api/library/<folder>`
- Removes a folder and its entries from the index

## States & Transitions

### App States

1. **Empty** — First launch, no videos indexed. Drop zone prominent, search disabled.
2. **Indexing** — Processing dropped videos. Show progress toast with spinner.
3. **Ready** — Videos indexed, search bar active. Results panel shows "Search for something."
4. **Results** — Search performed, results displayed. Player panel shows "Select a result."
5. **Playing** — Result selected, video playing with match markers on seek bar.

### Error States

- **ffmpeg not found** — Show setup dialog: "VideoSearch requires ffmpeg. Install it with: `brew install ffmpeg`"
- **No results** — "No matches found. Try a different description."
- **Indexing error** — Toast: "Could not index file.mp4: [error]" (continues with others)

## Settings

Accessible from gear icon in sidebar. Simple modal/panel:

- **Frame interval** — seconds between sampled frames (default: 5). Lower = more accurate but slower indexing.
- **Search threshold** — minimum similarity score (default: 0.2). Higher = stricter matching.
- **Top-K results** — max number of video results (default: 10).

## File Structure (New)

```
videosearch/
├── src-tauri/              # Tauri Rust shell
│   ├── Cargo.toml
│   ├── tauri.conf.json     # Window config, sidecar setup
│   └── src/
│       └── main.rs         # Tauri entry, sidecar lifecycle
├── src/                    # React frontend
│   ├── App.tsx             # Root layout (sidebar + main)
│   ├── main.tsx            # React entry
│   ├── index.css           # Tailwind + glassmorphism globals
│   ├── components/
│   │   ├── Sidebar.tsx     # Logo, search, drop zone, library, recent, settings
│   │   ├── SearchBar.tsx   # Glass-styled search input
│   │   ├── DropZone.tsx    # Drag & drop area
│   │   ├── ResultsList.tsx # Scrollable result cards
│   │   ├── ResultCard.tsx  # Single result with thumbnail + timestamps
│   │   ├── VideoPlayer.tsx # HTML5 player with match markers
│   │   ├── SettingsModal.tsx
│   │   └── Toast.tsx       # Notification toasts
│   ├── hooks/
│   │   ├── useSearch.ts    # Search API calls + state
│   │   ├── useLibrary.ts   # Library management + indexing
│   │   └── usePlayer.ts    # Player state + seeking
│   └── lib/
│       └── api.ts          # FastAPI client (fetch wrapper)
├── api.py                  # FastAPI server (sidecar entry)
├── videosearch/            # Existing Python package (unchanged)
│   ├── cli.py
│   ├── extractor.py
│   ├── indexer.py
│   └── searcher.py
├── package.json            # React + Tauri deps
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── pyproject.toml          # Updated with FastAPI dep
```

## Out of Scope (Future)

- Audio/speech search (Whisper integration)
- Upgrading CLIP model (ViT-L-14 or larger)
- Mobile app
- Cloud sync
- Video editing/clipping from search results
- Keyboard shortcuts
