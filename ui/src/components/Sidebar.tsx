import SearchBar from "./SearchBar";
import DropZone from "./DropZone";
import type { LibraryFolder } from "../lib/api";

interface Props {
  onSearch: (query: string) => void;
  searchLoading: boolean;
  folders: LibraryFolder[];
  totalVideos: number;
  onDrop: (paths: string[]) => void;
  indexing: boolean;
  recentSearches: string[];
}

export default function Sidebar({
  onSearch,
  searchLoading,
  folders,
  totalVideos,
  onDrop,
  indexing,
  recentSearches,
}: Props) {
  return (
    <div className="w-[250px] flex-shrink-0 flex flex-col border-r border-white/[0.04]" style={{ background: "linear-gradient(180deg, #0c1222 0%, #080e1a 100%)" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center glow-cyan">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div>
          <span className="text-white/90 text-[15px] font-semibold tracking-tight block leading-tight">VideoSearch</span>
          <span className="text-white/20 text-[10px]">Local &middot; Private</span>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4 flex-1 overflow-hidden">
        {/* Search */}
        <SearchBar onSearch={onSearch} loading={searchLoading} />

        {/* Add videos */}
        <DropZone onDrop={onDrop} indexing={indexing} />

        {/* Library */}
        <div className="mt-1 flex-1 min-h-0 flex flex-col">
          <div className="text-white/20 text-[10px] uppercase tracking-[0.15em] font-medium mb-2 px-1 flex items-center justify-between">
            <span>Library</span>
            <span className="text-white/15">{totalVideos} videos</span>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 min-h-0">
            {folders.length === 0 ? (
              <p className="text-white/15 text-[11px] px-1 py-2">Add videos to get started</p>
            ) : (
              folders.map((folder) => (
                <div
                  key={folder.path}
                  className="glass-card rounded-lg px-3 py-2 flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.4)" }} />
                  <span className="text-white/40 text-[11px] truncate flex-1">
                    {folder.path.split("/").pop()}
                  </span>
                  <span className="text-white/15 text-[10px] flex-shrink-0 tabular-nums bg-white/[0.03] rounded px-1.5 py-0.5">
                    {folder.video_count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="border-t border-white/[0.04] pt-3">
            <div className="text-white/20 text-[10px] uppercase tracking-[0.15em] font-medium mb-2 px-1">
              Recent
            </div>
            <div className="flex flex-col gap-0.5">
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => onSearch(s)}
                  className="w-full text-left text-white/25 hover:text-white/50 text-[11px] px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer truncate flex items-center gap-2"
                >
                  <svg className="w-3 h-3 flex-shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="border-t border-white/[0.04] px-4 py-3">
        <button className="flex items-center gap-2 px-2 py-1.5 text-white/20 hover:text-white/40 text-[11px] transition-colors cursor-pointer rounded-lg hover:bg-white/[0.03] w-full">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>
    </div>
  );
}
