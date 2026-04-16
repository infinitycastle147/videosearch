import type { SearchResult, Timestamp } from "../lib/api";
import ResultCard from "./ResultCard";

interface Props {
  results: SearchResult[];
  query: string;
  loading: boolean;
  error: string | null;
  selectedFile: string | null;
  onSelect: (result: SearchResult) => void;
  onTimestampClick: (result: SearchResult, ts: Timestamp) => void;
}

export default function ResultsList({
  results,
  query,
  loading,
  error,
  selectedFile,
  onSelect,
  onTimestampClick,
}: Props) {
  return (
    <div className="w-[340px] flex-shrink-0 border-r border-white/[0.04] flex flex-col" style={{ background: "#070b15" }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex-shrink-0">
        <h2 className="text-white/50 text-xs font-medium">
          {query ? (
            loading ? (
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                Searching...
              </span>
            ) : error ? (
              <span className="text-red-400/70">{error}</span>
            ) : (
              <>
                Results for &ldquo;<span className="text-white/70">{query}</span>&rdquo;
                <span className="text-white/20 ml-2 font-normal">
                  {results.length} video{results.length !== 1 ? "s" : ""}
                </span>
              </>
            )
          ) : (
            <span className="text-white/25">Search results</span>
          )}
        </h2>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 min-h-0">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-3.5 flex gap-3 animate-pulse">
              <div className="w-[72px] h-[48px] bg-white/[0.03] rounded-lg" />
              <div className="flex-1">
                <div className="h-3 bg-white/[0.04] rounded w-3/4 mb-3" />
                <div className="h-2.5 bg-white/[0.03] rounded w-1/2 mb-3" />
                <div className="flex gap-1.5">
                  <div className="h-5 bg-white/[0.03] rounded-full w-10" />
                  <div className="h-5 bg-white/[0.03] rounded-full w-10" />
                </div>
              </div>
            </div>
          ))
        ) : results.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white/[0.08]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-white/15 text-xs leading-relaxed">
                {query ? (
                  <>No matches found.<br />Try a different description.</>
                ) : (
                  <>Search for something<br />to get started</>
                )}
              </p>
            </div>
          </div>
        ) : (
          results.map((result, i) => (
            <div key={`${result.video_dir}/${result.file}`} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}>
              <ResultCard
                result={result}
                selected={selectedFile === `${result.video_dir}/${result.file}`}
                onClick={() => onSelect(result)}
                onTimestampClick={(ts) => onTimestampClick(result, ts)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
