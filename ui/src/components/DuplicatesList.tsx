import type { DuplicateGroup } from "../lib/api";
import { getThumbnailUrl } from "../lib/api";

interface Props {
  groups: DuplicateGroup[];
  loading: boolean;
  error: string | null;
  scanned: boolean;
  onScan: () => void;
}

export default function DuplicatesList({
  groups,
  loading,
  error,
  scanned,
  onScan,
}: Props) {
  return (
    <div
      className="w-[380px] flex-shrink-0 border-r flex flex-col"
      style={{ borderColor: "var(--border-subtle)", background: "#080c16" }}
    >
      {/* Header */}
      <div className="px-6 pt-7 pb-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white/60 text-[14px] font-semibold">Duplicates</h2>
          <button
            onClick={onScan}
            disabled={loading}
            className="text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(34,211,238,0.06))",
              border: "1px solid rgba(34,211,238,0.2)",
              color: "rgba(34,211,238,0.8)",
            }}
          >
            {loading ? (
              <>
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                Scanning...
              </>
            ) : (
              <>
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Scan
              </>
            )}
          </button>
        </div>
        {error && <p className="text-red-400/70 text-[13px]">{error}</p>}
        {scanned && !loading && !error && (
          <p className="text-white/25 text-[13px]">
            {groups.length === 0
              ? "No duplicates found"
              : `${groups.length} group${groups.length !== 1 ? "s" : ""} found`}
          </p>
        )}
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3 min-h-0">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="h-4 animate-shimmer rounded-lg w-1/3 mb-5" />
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 animate-shimmer rounded-xl" />
                  <div className="h-3.5 animate-shimmer rounded-lg w-2/3" />
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 animate-shimmer rounded-xl" />
                  <div className="h-3.5 animate-shimmer rounded-lg w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : !scanned ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <svg className="w-9 h-9 text-white/[0.06]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white/25 text-[15px] leading-relaxed">
                Click <span className="text-cyan-300/60 font-semibold">Scan</span> to find
                <br />duplicate media
              </p>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                style={{
                  background: "rgba(52,211,153,0.05)",
                  border: "1px solid rgba(52,211,153,0.1)",
                }}
              >
                <svg className="w-9 h-9 text-emerald-400/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white/50 text-[16px] font-semibold mb-2">All clear</p>
              <p className="text-white/25 text-[14px] leading-relaxed">
                No duplicates found.<br />
                Your library is clean!
              </p>
            </div>
          </div>
        ) : (
          groups.map((group, gi) => (
            <div
              key={gi}
              className="glass-card rounded-2xl p-5 animate-fade-up"
              style={{ animationDelay: `${gi * 50}ms`, animationFillMode: "both" }}
            >
              {/* Group header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/35 text-[12px] font-bold uppercase tracking-wider">
                  Group {gi + 1}
                </span>
                <span
                  className="text-[12px] font-semibold tabular-nums px-3 py-1 rounded-lg"
                  style={{
                    background: "rgba(251,191,36,0.1)",
                    border: "1px solid rgba(251,191,36,0.15)",
                    color: "rgba(251,191,36,0.7)",
                  }}
                >
                  {(group.similarity * 100).toFixed(1)}% match
                </span>
              </div>

              {/* Files */}
              <div className="flex flex-col gap-2.5">
                {group.files.map((file) => (
                  <div
                    key={file}
                    className="flex items-center gap-3.5 rounded-xl px-3 py-2.5"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.03] flex items-center justify-center border border-white/[0.04]">
                      <img
                        src={getThumbnailUrl(file)}
                        alt={file}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = "none";
                          img.parentElement!.innerHTML =
                            '<svg class="w-5 h-5 text-white/10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
                        }}
                      />
                    </div>
                    <span className="text-white/55 text-[13px] font-medium truncate flex-1">
                      {file}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
