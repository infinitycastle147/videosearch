from pathlib import Path

import numpy as np
import open_clip
import torch

from .indexer import load_index, load_model


def search(
    video_dir: Path,
    query: str,
    top_k: int = 5,
    threshold: float = 0.2,
) -> list[dict]:
    """Search the video index for clips matching the text query.

    Returns a list of result dicts (up to top_k), each containing:
      file, mtime, timestamp_sec, timestamp_str, score
    Sorted by score descending. Only results >= threshold are returned.
    """
    embeddings, metadata = load_index(video_dir)

    if len(embeddings) == 0:
        raise RuntimeError(
            f"No index found in {video_dir}. Run 'videosearch index <dir>' first."
        )

    model, _ = load_model()
    tokenizer = open_clip.get_tokenizer("ViT-B-32")

    tokens = tokenizer([query])
    with torch.no_grad():
        query_emb = model.encode_text(tokens)
        query_emb = query_emb / query_emb.norm(dim=-1, keepdim=True)

    query_vec = query_emb.squeeze(0).numpy().astype(np.float32)
    scores = embeddings @ query_vec  # cosine similarity (both L2-normalized)

    # Group all above-threshold hits by video file
    groups: dict[str, list[dict]] = {}
    for idx, score_val in enumerate(scores):
        score_f = float(score_val)
        if score_f < threshold:
            continue
        file_name = metadata[idx]["file"]
        hit = {
            "timestamp_sec": metadata[idx]["timestamp_sec"],
            "timestamp_str": metadata[idx]["timestamp_str"],
            "score": score_f,
        }
        if file_name not in groups:
            groups[file_name] = []
        groups[file_name].append(hit)

    # Sort timestamps within each group by score descending
    for hits in groups.values():
        hits.sort(key=lambda h: h["score"], reverse=True)

    # Build results sorted by best score per video, limited to top_k videos
    ranked_videos = sorted(groups.items(), key=lambda g: g[1][0]["score"], reverse=True)

    results = []
    for file_name, hits in ranked_videos[:top_k]:
        results.append({
            "file": file_name,
            "best_score": hits[0]["score"],
            "timestamps": hits,
        })

    return results
