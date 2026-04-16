import type { SearchResult, Timestamp } from "../lib/api";
import { getThumbnailUrl } from "../lib/api";

interface Props {
  result: SearchResult;
  selected: boolean;
  onClick: () => void;
  onTimestampClick: (ts: Timestamp) => void;
}

export default function ResultCard({
  result,
  selected,
  onClick,
  onTimestampClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-3.5 flex gap-3 cursor-pointer transition-all duration-150 ${
        selected ? "glass-card-active" : "glass-card"
      }`}
    >
      {/* Thumbnail */}
      <div className="w-[76px] h-[50px] rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.03] flex items-center justify-center border border-white/[0.04]">
        <img
          src={getThumbnailUrl(result.file)}
          alt={result.file}
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = "none";
            img.parentElement!.innerHTML =
              '<svg class="w-5 h-5 text-white/10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-medium truncate mb-1 ${selected ? "text-white/90" : "text-white/60"}`}>
          {result.file}
        </p>
        <p className="text-white/20 text-[10px] mb-2 tabular-nums">
          {result.best_score.toFixed(2)} score &middot;{" "}
          {result.timestamps.length} match{result.timestamps.length !== 1 ? "es" : ""}
        </p>
        <div className="flex flex-wrap gap-1">
          {result.timestamps.map((ts) => (
            <button
              key={ts.timestamp_sec}
              onClick={(e) => { e.stopPropagation(); onTimestampClick(ts); }}
              className={`rounded-md px-2 py-0.5 text-[9px] font-medium transition-all cursor-pointer tabular-nums ${
                selected
                  ? "bg-cyan-400/12 text-cyan-300/80 hover:bg-cyan-400/20"
                  : "bg-white/[0.04] text-white/25 hover:bg-white/[0.08] hover:text-white/40"
              }`}
            >
              {ts.timestamp_str}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
