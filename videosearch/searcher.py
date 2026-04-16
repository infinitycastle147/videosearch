from pathlib import Path

import numpy as np
import onnxruntime as ort

from .clip_tokenizer import tokenize
from .indexer import _find_model, load_index


def load_text_session() -> ort.InferenceSession:
    """Load the CLIP text encoder ONNX session."""
    model_path = _find_model("clip_text_encoder.onnx")
    return ort.InferenceSession(str(model_path))


def search(
    video_dir: Path,
    query: str,
    top_k: int = 5,
    threshold: float = 0.2,
) -> list[dict]:
    """Search the video index for clips matching the text query.

    Returns a list of result dicts (up to top_k), each containing:
      file, best_score, timestamps (list of {timestamp_sec, timestamp_str, score})
    Sorted by best_score descending. Only results >= threshold are returned.
    """
    embeddings, metadata = load_index(video_dir)

    if len(embeddings) == 0:
        raise RuntimeError(
            f"No index found in {video_dir}. Run 'videosearch index <dir>' first."
        )

    session = load_text_session()
    tokens = tokenize(query)
    outputs = session.run(None, {"text": tokens})
    query_emb = outputs[0].squeeze(0)
    query_vec = (query_emb / np.linalg.norm(query_emb)).astype(np.float32)

    scores = embeddings @ query_vec

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

    for hits in groups.values():
        hits.sort(key=lambda h: h["score"], reverse=True)

    ranked_videos = sorted(groups.items(), key=lambda g: g[1][0]["score"], reverse=True)

    results = []
    for file_name, hits in ranked_videos[:top_k]:
        results.append({
            "file": file_name,
            "best_score": hits[0]["score"],
            "timestamps": hits,
        })

    return results
