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

    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)

    results = []
    for idx, score in ranked:
        if float(score) < threshold:
            break
        if len(results) >= top_k:
            break
        results.append({**metadata[idx], "score": float(score)})

    return results
