# VideoSearch Roadmap

## Quick Wins

- [ ] **Duplicate/similar media finder** — Find near-duplicate images and video clips using existing embeddings (cosine similarity > 0.95)
- [ ] **Thumbnail preview on hover** — Show the actual matching frame in search results instead of just filenames
- [ ] **Drag & drop folder selection** — Drop a folder onto the app instead of using the file picker dialog
- [ ] **Re-index button in the UI** — Let users trigger re-indexing from the app without reopening the folder

## Medium Effort

- [ ] **Image-to-image search** — "Find videos/photos similar to this image" using the CLIP image encoder on the query
- [ ] **Favorites / bookmarks** — Save specific search results for quick access
- [ ] **Export results** — Copy timestamps, generate a clip montage, or export to CSV
- [ ] **Multi-folder library** — Manage multiple folders from one unified view

## Bigger Features

- [ ] **Smart albums / auto-tagging** — Automatically group media by scene type (beach, food, people, nature) using CLIP zero-shot classification
- [ ] **Face clustering** — Group photos and video clips by person using a face embedding model
- [ ] **Timeline view** — Visual timeline of a video showing what's in each segment
- [ ] **Audio transcription search** — Index spoken words in videos using Whisper (or ONNX variant) for text-based search
