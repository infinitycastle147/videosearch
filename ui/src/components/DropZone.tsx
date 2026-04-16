import { open } from "@tauri-apps/plugin-dialog";

interface Props {
  onDrop: (paths: string[]) => void;
  indexing: boolean;
}

export default function DropZone({ onDrop, indexing }: Props) {
  const handleAddFolder = async () => {
    if (indexing) return;
    const selected = await open({
      directory: true,
      multiple: true,
      title: "Select folder containing videos",
    });
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      if (paths.length > 0) onDrop(paths);
    }
  };

  const handleAddFiles = async () => {
    if (indexing) return;
    const selected = await open({
      directory: false,
      multiple: true,
      title: "Select video files",
      filters: [{ name: "Videos", extensions: ["mp4", "mkv", "avi", "mov"] }],
    });
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      if (paths.length > 0) onDrop(paths);
    }
  };

  if (indexing) {
    return (
      <div className="rounded-xl p-4 text-center bg-cyan-400/[0.03] border border-cyan-400/10">
        <svg className="w-5 h-5 mx-auto mb-2 animate-spin text-cyan-400/60" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeLinecap="round" />
        </svg>
        <p className="text-white/30 text-[11px]">Indexing videos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleAddFolder}
        className="w-full rounded-xl p-3 text-left flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] hover:bg-cyan-400/[0.04] hover:border-cyan-400/15 transition-all cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center group-hover:bg-cyan-400/15 transition-colors">
          <svg className="w-4 h-4 text-cyan-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>
        <div>
          <p className="text-white/60 text-[11px] font-medium group-hover:text-white/80 transition-colors">Add Folder</p>
          <p className="text-white/20 text-[10px]">Select a video folder</p>
        </div>
      </button>

      <button
        onClick={handleAddFiles}
        className="w-full rounded-xl p-3 text-left flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] hover:bg-blue-400/[0.04] hover:border-blue-400/15 transition-all cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center group-hover:bg-blue-400/15 transition-colors">
          <svg className="w-4 h-4 text-blue-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
          </svg>
        </div>
        <div>
          <p className="text-white/60 text-[11px] font-medium group-hover:text-white/80 transition-colors">Add Videos</p>
          <p className="text-white/20 text-[10px]">Select MP4, MKV, AVI, MOV</p>
        </div>
      </button>
    </div>
  );
}
