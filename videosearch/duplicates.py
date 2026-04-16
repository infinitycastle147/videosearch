"""Find duplicate or near-duplicate media using existing CLIP embeddings."""

from pathlib import Path

import numpy as np

from .indexer import load_index


def find_duplicates(
    video_dir: Path,
    similarity_threshold: float = 0.95,
) -> list[dict]:
    """Find groups of near-duplicate media in an indexed directory.

    Compares every pair of files using their best-matching embeddings.
    Two files are considered duplicates if their max cosine similarity
    exceeds similarity_threshold.

    Returns a list of duplicate groups, each containing:
      files: list of filenames in the group
      similarity: highest pairwise similarity in the group
    Sorted by similarity descending.
    """
    embeddings, metadata = load_index(video_dir)

    if len(embeddings) == 0:
        return []

    # Group embeddings by file — use the mean embedding per file
    file_names: list[str] = []
    file_embeddings: list[np.ndarray] = []

    files_seen: dict[str, list[int]] = {}
    for idx, m in enumerate(metadata):
        fname = m["file"]
        if fname not in files_seen:
            files_seen[fname] = []
        files_seen[fname].append(idx)

    for fname, indices in files_seen.items():
        file_names.append(fname)
        # Use mean of all frame embeddings for this file
        vecs = embeddings[indices]
        mean_vec = vecs.mean(axis=0)
        mean_vec = mean_vec / np.linalg.norm(mean_vec)
        file_embeddings.append(mean_vec)

    if len(file_names) < 2:
        return []

    file_matrix = np.stack(file_embeddings).astype(np.float32)
    # Pairwise cosine similarity
    sim_matrix = file_matrix @ file_matrix.T

    # Find pairs above threshold (excluding self-similarity)
    n = len(file_names)
    # Union-Find for grouping
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    pair_sims: dict[tuple[int, int], float] = {}
    for i in range(n):
        for j in range(i + 1, n):
            s = float(sim_matrix[i, j])
            if s >= similarity_threshold:
                union(i, j)
                pair_sims[(i, j)] = s

    # Build groups
    groups: dict[int, list[int]] = {}
    for i in range(n):
        root = find(i)
        if root not in groups:
            groups[root] = []
        groups[root].append(i)

    # Only keep groups with 2+ members
    results = []
    for members in groups.values():
        if len(members) < 2:
            continue
        # Find max similarity within the group
        max_sim = 0.0
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                a, b = min(members[i], members[j]), max(members[i], members[j])
                max_sim = max(max_sim, pair_sims.get((a, b), 0.0))
        results.append({
            "files": [file_names[i] for i in members],
            "similarity": max_sim,
        })

    results.sort(key=lambda g: g["similarity"], reverse=True)
    return results
