const API_BASE = "http://localhost:8008";

export interface Timestamp {
  timestamp_sec: number;
  timestamp_str: string;
  score: number;
}

export interface SearchResult {
  file: string;
  video_dir: string;
  best_score: number;
  timestamps: Timestamp[];
}

export interface IndexResponse {
  indexed: number;
  skipped: number;
  total: number;
}

export interface LibraryFolder {
  path: string;
  video_count: number;
}

export async function searchVideos(
  query: string,
  topK = 10,
  threshold = 0.2
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    top_k: String(topK),
    threshold: String(threshold),
  });
  const res = await fetch(`${API_BASE}/api/search?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function indexPaths(paths: string[]): Promise<IndexResponse> {
  const res = await fetch(`${API_BASE}/api/index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLibrary(): Promise<LibraryFolder[]> {
  const res = await fetch(`${API_BASE}/api/library`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function removeFolder(path: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/library?path=${encodeURIComponent(path)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await res.text());
}

export function getThumbnailUrl(filename: string): string {
  return `${API_BASE}/api/thumbnail/${encodeURIComponent(filename)}`;
}

export function getVideoUrl(filepath: string, videoDir?: string): string {
  let url = `${API_BASE}/api/video?path=${encodeURIComponent(filepath)}`;
  if (videoDir) url += `&dir=${encodeURIComponent(videoDir)}`;
  return url;
}
