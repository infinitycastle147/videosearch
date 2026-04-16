import type { RefObject, MouseEvent } from "react";
import type { SearchResult, Timestamp } from "../lib/api";
import { getVideoUrl } from "../lib/api";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  result: SearchResult | null;
  currentTime: number;
  duration: number;
  playing: boolean;
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onSeekTo: (ts: Timestamp) => void;
  onSeekToPosition: (fraction: number) => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onEnded: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPlayer({
  videoRef,
  result,
  currentTime,
  duration,
  playing,
  onTogglePlay,
  onSkip,
  onSeekTo,
  onSeekToPosition,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
}: Props) {
  const handleSeekBarClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    onSeekToPosition(Math.max(0, Math.min(1, fraction)));
  };

  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ background: "#060a12" }}>
        <div className="w-24 h-24 rounded-3xl bg-white/[0.02] border border-white/[0.03] flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-white/[0.06]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <p className="text-white/12 text-sm">Select a result to play</p>
      </div>
    );
  }

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex-1 flex flex-col p-5 min-w-0" style={{ background: "#060a12" }}>
      {/* Video container */}
      <div className="flex-1 bg-black/60 border border-white/[0.04] rounded-2xl overflow-hidden relative flex items-center justify-center min-h-0">
        <video
          ref={videoRef}
          src={getVideoUrl(result.file, result.video_dir)}
          className="w-full h-full object-contain"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={onEnded}
          onClick={onTogglePlay}
        />

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-16 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {/* Seek bar */}
          <div className="flex items-center gap-3 mb-4 cursor-pointer group" onClick={handleSeekBarClick}>
            <span className="text-white/40 text-[10px] w-8 text-right flex-shrink-0 tabular-nums font-medium">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 h-[3px] bg-white/[0.08] rounded-full relative group-hover:h-[5px] transition-all">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  background: "linear-gradient(90deg, #22d3ee, #3b82f6)",
                }}
              />
              {/* Match markers */}
              {duration > 0 && result.timestamps.map((ts) => (
                <div
                  key={ts.timestamp_sec}
                  className="absolute top-1/2 w-[10px] h-[10px] bg-pink-400 rounded-full border-2 border-black/70 z-10 glow-pink"
                  style={{
                    left: `${(ts.timestamp_sec / duration) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  title={ts.timestamp_str}
                />
              ))}
            </div>
            <span className="text-white/40 text-[10px] w-8 flex-shrink-0 tabular-nums font-medium">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-7">
            <button
              onClick={(e) => { e.stopPropagation(); onSkip(-10); }}
              className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer hover:scale-105"
              style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(34,211,238,0.2)" }}
            >
              {playing ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSkip(10); }}
              className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Video info */}
      <div className="pt-4 px-1">
        <p className="text-white/85 text-[15px] font-semibold mb-1 truncate">
          {result.file}
        </p>
        <p className="text-white/25 text-[11px] mb-3 tabular-nums">
          Score: {result.best_score.toFixed(2)}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white/15 text-[10px] font-medium">Jump to</span>
          {result.timestamps.map((ts, i) => (
            <button
              key={ts.timestamp_sec}
              onClick={() => onSeekTo(ts)}
              className="rounded-lg px-3 py-1 text-[10px] font-medium transition-all cursor-pointer tabular-nums animate-fade-up"
              style={{
                background: "rgba(244, 114, 182, 0.08)",
                border: "1px solid rgba(244, 114, 182, 0.15)",
                color: "rgba(244, 114, 182, 0.7)",
                animationDelay: `${i * 30}ms`,
                animationFillMode: "both",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(244, 114, 182, 0.15)";
                e.currentTarget.style.borderColor = "rgba(244, 114, 182, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(244, 114, 182, 0.08)";
                e.currentTarget.style.borderColor = "rgba(244, 114, 182, 0.15)";
              }}
            >
              {ts.timestamp_str}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
