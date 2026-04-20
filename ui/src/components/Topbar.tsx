import { useRef, useEffect } from "react";
import { SearchIcon, GridIcon, ListIcon, SlidersIcon, BackIcon } from "./Icons";

interface TopbarProps {
  query: string;
  setQuery: (q: string) => void;
  onSearch: (q: string) => void;
  resultMode: "grid" | "list";
  setResultMode: (m: "grid" | "list") => void;
  onTweaks: () => void;
  showBack: boolean;
  onBack: () => void;
}

export default function Topbar({ query, setQuery, onSearch, resultMode, setResultMode, onTweaks, showBack, onBack }: TopbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="topbar">
      {showBack && (
        <button className="icon-btn" onClick={onBack} aria-label="Back"><BackIcon size={16} /></button>
      )}

      <div className="search">
        <SearchIcon size={14} className="sicon" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you're looking for — people, scenes, objects, text…"
          spellCheck={false}
        />
        <kbd className="hotkey">⌘K</kbd>
      </div>

      <div className="mode-tabs">
        <button className={`mode-tab ${resultMode === "grid" ? "active" : ""}`} onClick={() => setResultMode("grid")}>
          <GridIcon size={12} /><span>Grid</span>
        </button>
        <button className={`mode-tab ${resultMode === "list" ? "active" : ""}`} onClick={() => setResultMode("list")}>
          <ListIcon size={12} /><span>List</span>
        </button>
      </div>

      <div className="topbar-right">
        <button className="btn ghost" onClick={onTweaks} title="Tweaks">
          <SlidersIcon size={14} />
        </button>
      </div>
    </div>
  );
}
