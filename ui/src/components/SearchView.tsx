import { useState, useMemo } from "react";
import Thumb from "./Thumb";
import { VideoIcon, ImageIcon, ClockIcon, SearchIcon } from "./Icons";
import { getThumbnailUrl } from "../lib/api";
import type { SearchResult } from "../lib/api";

const isVideo = (file: string) => /\.(mp4|mov|avi|mkv|webm|m4v|ts)$/i.test(file);

const confBar = (score: number) => {
  const c = Math.round(score * 100);
  const color = c >= 85 ? "var(--success)" : c >= 70 ? "var(--accent)" : "var(--warn)";
  return (
    <div title={`${c}% semantic match`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--fg-dim)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Match</span>
      <div style={{ width: 36, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${c}%`, height: "100%", background: color }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)" }}>{c}%</span>
    </div>
  );
};

interface ResultCardProps {
  r: SearchResult;
  onOpen: (r: SearchResult) => void;
}

function ResultCard({ r, onOpen }: ResultCardProps) {
  const video = isVideo(r.file);
  const matchTs = r.timestamps[0]?.timestamp_str;
  const title = r.file.split("/").pop() || r.file;

  return (
    <button
      onClick={() => onOpen(r)}
      style={{ display: "flex", flexDirection: "column", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", textAlign: "left", padding: 0, transition: "border-color .1s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
    >
      <Thumb src={getThumbnailUrl(r.file)} ratio="16 / 10">
        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.04em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}>
          {video ? <VideoIcon size={10} /> : <ImageIcon size={10} />}
          {video ? "video" : "image"}
        </div>
        {matchTs && (
          <div style={{ position: "absolute", bottom: 8, left: 8, background: "var(--accent)", color: "var(--accent-fg)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ClockIcon size={10} />{matchTs}
          </div>
        )}
        <div className="play-overlay" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 0, transition: "opacity .15s" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.95)", display: "grid", placeItems: "center", color: "#000" }}>
            <SearchIcon size={16} />
          </div>
        </div>
      </Thumb>
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.video_dir}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          {confBar(r.best_score)}
        </div>
      </div>
    </button>
  );
}

function ResultRow({ r, onOpen }: ResultCardProps) {
  const video = isVideo(r.file);
  const matchTs = r.timestamps[0]?.timestamp_str;
  const title = r.file.split("/").pop() || r.file;
  const c = Math.round(r.best_score * 100);
  const color = c >= 85 ? "var(--success)" : c >= 70 ? "var(--accent)" : "var(--warn)";

  return (
    <button
      onClick={() => onOpen(r)}
      style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px", gap: 14, alignItems: "center", width: "100%", padding: "8px 14px", background: "transparent", border: 0, borderBottom: "1px solid var(--border)", textAlign: "left", transition: "background .08s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      <Thumb src={getThumbnailUrl(r.file)} ratio="16 / 10" style={{ borderRadius: 4 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--fg-dim)" }}>{video ? <VideoIcon size={12} /> : <ImageIcon size={12} />}</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>
          {matchTs && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, background: "var(--accent-bg)", color: "var(--accent)", padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>@ {matchTs}</span>
          )}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.video_dir}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 36, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${c}%`, height: "100%", background: color }} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)" }}>{c}%</span>
      </div>
    </button>
  );
}

const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button className={`pill ${on ? "on" : ""}`} onClick={onClick}>{children}</button>
);

const RECENT_QUERIES = [
  "person in red jacket at sunset",
  "mountain ridge wide shot",
  "cabin interior with warm light",
  "cars on coastal road",
];

interface SearchViewProps {
  query: string;
  setQuery: (q: string) => void;
  onSearch: (q: string) => void;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  resultMode: "grid" | "list";
  onOpenResult: (r: SearchResult) => void;
  recentSearches: string[];
  hasLibrary: boolean;
}

export default function SearchView({ query, setQuery, onSearch, results, loading, error, resultMode, onOpenResult, recentSearches, hasLibrary }: SearchViewProps) {
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    if (typeFilter === "all") return results;
    if (typeFilter === "video") return results.filter(r => isVideo(r.file));
    return results.filter(r => !isVideo(r.file));
  }, [results, typeFilter]);

  const hasQuery = query.trim().length > 0 && results.length > 0;

  if (!hasLibrary) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 32 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bg-active)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "var(--fg-dim)" }}>
            <SearchIcon size={22} />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>No library yet</h2>
          <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: 13, lineHeight: 1.55 }}>
            Add folders from the sidebar to start indexing your media.
          </p>
        </div>
      </div>
    );
  }

  if (!hasQuery && !loading) {
    return (
      <div style={{ padding: "40px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg)", padding: 32 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-bg)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <SearchIcon size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>What are you looking for?</h2>
              <p style={{ margin: "4px 0 0", color: "var(--fg-muted)", fontSize: 13, lineHeight: 1.55 }}>
                Describe it like you'd tell a friend. The local model understands scenes, objects, actions, text, and spatial relationships.
              </p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 24 }}>
            {(recentSearches.length > 0 ? recentSearches : RECENT_QUERIES).slice(0, 4).map((q, i) => (
              <button key={i} onClick={() => { setQuery(q); onSearch(q); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-2)", textAlign: "left", fontSize: 13, transition: "all .1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}>
                <ClockIcon size={13} style={{ color: "var(--fg-dim)", flexShrink: 0 }} />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-dim)", fontWeight: 600, marginBottom: 12, padding: "0 4px" }}>Tips</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { t: "Describe a scene",    e: '"golden retriever on a beach at dusk"' },
              { t: "Find a moment",       e: '"the goal from last night\'s match"' },
              { t: "Search across media", e: '"screenshots with a payment form"' },
            ].map(tip => (
              <div key={tip.t} style={{ padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{tip.t}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>{tip.e}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>Searching…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--danger)" }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Search failed</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Results for</div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 2 }}>
            "{query}"
            <span style={{ marginLeft: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)", fontWeight: 400 }}>
              {filtered.length} match{filtered.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Pill on={typeFilter === "all"}   onClick={() => setTypeFilter("all")}>All</Pill>
        <Pill on={typeFilter === "video"} onClick={() => setTypeFilter("video")}>Videos</Pill>
        <Pill on={typeFilter === "image"} onClick={() => setTypeFilter("image")}>Images</Pill>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-muted)", fontSize: 13 }}>
          No results for this filter.
        </div>
      ) : resultMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {filtered.map(r => <ResultCard key={r.file} r={r} onOpen={onOpenResult} />)}
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px", gap: 14, padding: "8px 14px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--fg-dim)", textTransform: "uppercase", borderBottom: "1px solid var(--border)", background: "var(--bg-2)" }}>
            <div /><div>File</div><div>Match</div>
          </div>
          {filtered.map(r => <ResultRow key={r.file} r={r} onOpen={onOpenResult} />)}
        </div>
      )}
    </div>
  );
}
