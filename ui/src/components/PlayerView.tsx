import { useRef } from "react";
import Thumb from "./Thumb";
import { PlayIcon, PauseIcon, BackIcon, ForwardIcon, VolumeIcon, MaximizeIcon, ShareIcon, DownloadIcon, StarIcon, FolderIcon, TrashIcon } from "./Icons";
import { getThumbnailUrl, getVideoUrl } from "../lib/api";
import type { SearchResult } from "../lib/api";

const isVideo = (file: string) => /\.(mp4|mov|avi|mkv|webm|m4v|ts)$/i.test(file);

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

interface PlayerViewProps {
  result: SearchResult;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  playing: boolean;
  onTogglePlay: () => void;
  onSkip: (s: number) => void;
  onSeekToPosition: (fraction: number) => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onEnded: () => void;
  query: string;
  onBack: () => void;
}

export default function PlayerView({ result, videoRef, currentTime, duration, playing, onTogglePlay, onSkip, onSeekToPosition, onTimeUpdate, onLoadedMetadata, onEnded, query }: PlayerViewProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const video = isVideo(result.file);
  const title = result.file.split("/").pop() || result.file;
  const confidence = Math.round(result.best_score * 100);
  const matchTs = result.timestamps[0]?.timestamp_str;

  const onSeek = (e: React.MouseEvent) => {
    const rect = timelineRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    onSeekToPosition(x / rect.width);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* LEFT: player */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg-2)" }}>
        <div style={{ padding: "20px 24px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              {video ? "Video" : "Image"} · matched "{query}"
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {title}
            </div>
          </div>
          <button className="btn ghost"><ShareIcon size={13} /></button>
          <button className="btn ghost"><DownloadIcon size={13} /></button>
          <button className="btn ghost"><StarIcon size={13} /></button>
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: "8px 24px 18px", display: "flex", flexDirection: "column" }}>
          {video ? (
            <div style={{ flex: 1, minHeight: 0, borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", background: "#000", position: "relative" }}>
              <video
                ref={videoRef}
                src={getVideoUrl(result.file, result.video_dir)}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={onEnded}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
              {!playing && (
                <button onClick={onTogglePlay} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.92)", color: "#000", display: "grid", placeItems: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.45)" }}>
                    <PlayIcon size={26} />
                  </div>
                </button>
              )}
              {matchTs && (
                <div style={{ position: "absolute", top: 14, left: 14, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", color: "#fff", fontSize: 11, padding: "5px 9px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                  <span style={{ fontFamily: "var(--font-mono)" }}>FRAME @ {matchTs}</span>
                  <span style={{ opacity: 0.8 }}>· {confidence}% match</span>
                </div>
              )}
            </div>
          ) : (
            <Thumb src={getThumbnailUrl(result.file)} ratio="4 / 3" style={{ flex: 1, minHeight: 0, borderRadius: 12, border: "1px solid var(--border)" }} />
          )}

          {/* Controls */}
          {video && (
            <div style={{ marginTop: 14, padding: "14px 16px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12 }}>
              {/* Timeline */}
              <div ref={timelineRef} onClick={onSeek} style={{ position: "relative", height: 36, padding: "14px 0", cursor: "pointer" }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 4, transform: "translateY(-50%)", background: "var(--border)", borderRadius: 2 }} />
                <div style={{ position: "absolute", left: 0, width: `${progress}%`, top: "50%", height: 4, transform: "translateY(-50%)", background: "var(--accent)", borderRadius: 2 }} />
                {/* Timestamp markers */}
                {result.timestamps.map((ts, i) => {
                  const pos = duration > 0 ? (ts.timestamp_sec / duration) * 100 : 0;
                  return (
                    <div key={i} title={`Match @ ${ts.timestamp_str}`} style={{ position: "absolute", left: `${pos}%`, top: "50%", transform: "translate(-50%, -50%)", width: 3, height: 16, background: i === 0 ? "var(--accent)" : "var(--warn)", borderRadius: 1.5, pointerEvents: "none", boxShadow: i === 0 ? "0 0 0 3px var(--accent-bg)" : "none" }} />
                  );
                })}
                {/* Playhead */}
                <div style={{ position: "absolute", left: `${progress}%`, top: "50%", transform: "translate(-50%, -50%)", width: 12, height: 12, borderRadius: "50%", background: "var(--fg)", border: "2px solid var(--bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", pointerEvents: "none" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <button className="icon-btn" onClick={onTogglePlay} style={{ background: "var(--fg)", color: "var(--bg)", width: 32, height: 32, borderRadius: 8 }}>
                  {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                </button>
                <button className="icon-btn" onClick={() => onSkip(-10)}><BackIcon size={14} /></button>
                <button className="icon-btn" onClick={() => onSkip(10)}><ForwardIcon size={14} /></button>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-muted)", marginLeft: 6 }}>
                  {fmt(currentTime)} <span style={{ color: "var(--fg-dim)" }}>/ {fmt(duration)}</span>
                </div>
                <div style={{ flex: 1 }} />
                <button className="icon-btn"><VolumeIcon size={14} /></button>
                <button className="icon-btn"><MaximizeIcon size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: detail panel */}
      <aside style={{ width: 320, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--bg)", overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Matched timestamps */}
        {video && result.timestamps.length > 0 && (
          <section>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-dim)", fontWeight: 600, marginBottom: 10 }}>Matched frames</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.timestamps.slice(0, 5).map((ts, i) => {
                const isActive = Math.abs(currentTime - ts.timestamp_sec) < 1;
                return (
                  <button key={i}
                    onClick={() => { if (videoRef.current) { videoRef.current.currentTime = ts.timestamp_sec; } }}
                    style={{ display: "flex", gap: 10, alignItems: "center", padding: 6, borderRadius: 8, border: `1px solid ${isActive ? "var(--accent)" : "transparent"}`, background: isActive ? "var(--accent-bg)" : "transparent", textAlign: "left", transition: "all .1s" }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <Thumb src={getThumbnailUrl(result.file)} ratio="16 / 10" style={{ width: 72, borderRadius: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{ts.timestamp_str}</div>
                      <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 1 }}>
                        {Math.round(ts.score * 100)}% {i === 0 ? "· primary match" : "match"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Details */}
        <section>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-dim)", fontWeight: 600, marginBottom: 10 }}>Details</div>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["File", title],
                ["Path", result.video_dir],
                ["Confidence", `${confidence}%`],
                ["Match at", matchTs || "—"],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: "5px 0", color: "var(--fg-dim)", verticalAlign: "top", width: 84 }}>{k}</td>
                  <td style={{ padding: "5px 0", fontFamily: k === "Path" || k === "File" ? "var(--font-mono)" : undefined, fontSize: k === "Path" || k === "File" ? 10.5 : 12, wordBreak: "break-all" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: "auto", display: "flex", gap: 6 }}>
          <button className="btn" style={{ flex: 1 }}><FolderIcon size={13} /> Reveal in Finder</button>
          <button className="btn ghost"><TrashIcon size={13} /></button>
        </section>
      </aside>
    </div>
  );
}
