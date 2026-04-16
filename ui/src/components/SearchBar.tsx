import { useState, type KeyboardEvent } from "react";

interface Props {
  onSearch: (query: string) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onSearch(value.trim());
    }
  };

  return (
    <div
      className={`
        rounded-xl px-3.5 py-3 flex items-center gap-3 transition-all duration-200
        ${focused
          ? "bg-white/[0.06] border border-cyan-400/25 shadow-[0_0_15px_rgba(34,211,238,0.08)]"
          : "bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1]"
        }
      `}
    >
      {loading ? (
        <svg className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className={`w-4 h-4 flex-shrink-0 transition-colors ${focused ? "text-cyan-400" : "text-white/20"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search your videos..."
        className="bg-transparent outline-none text-white/80 placeholder:text-white/15 text-[13px] w-full"
      />
    </div>
  );
}
