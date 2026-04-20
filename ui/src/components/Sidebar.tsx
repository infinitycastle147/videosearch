import { HomeIcon, SearchIcon, CopyIcon, FolderIcon, PlusIcon, ImageIcon } from "./Icons";
import type { LibraryFolder } from "../lib/api";

export type View = "home" | "search" | "library" | "duplicates";

interface SidebarProps {
  view: View;
  setView: (v: View) => void;
  totalVideos: number;
  duplicatesCount: number;
  folders: LibraryFolder[];
  onAddFolder: () => void;
  onFolderClick: (path: string) => void;
  activeFolder: string | null;
}

export default function Sidebar({ view, setView, totalVideos, duplicatesCount, folders, onAddFolder, onFolderClick, activeFolder }: SidebarProps) {
  const nav = [
    { id: "home" as View,       label: "Home",       icon: <HomeIcon size={15} />,   count: null,                             accent: false },
    { id: "search" as View,     label: "Search",     icon: <SearchIcon size={15} />, count: null,                             accent: false },
    { id: "library" as View,    label: "Library",    icon: <ImageIcon size={15} />,  count: totalVideos > 0 ? totalVideos : null, accent: false },
    { id: "duplicates" as View, label: "Duplicates", icon: <CopyIcon size={15} />,   count: duplicatesCount > 0 ? duplicatesCount : null, accent: duplicatesCount > 0 },
  ];

  return (
    <aside className="sidebar">
      <div className="nav-section">
        {nav.map(n => (
          <button
            key={n.id}
            className={`nav-item ${view === n.id ? "active" : ""}`}
            onClick={() => setView(n.id)}
          >
            <span className="ic" style={{ color: n.accent ? "var(--warn)" : undefined }}>{n.icon}</span>
            <span>{n.label}</span>
            {n.count != null && <span className="count">{n.count.toLocaleString()}</span>}
          </button>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Library</div>
        {folders.map(f => {
          const name = f.path.split("/").pop() || f.path;
          const isActive = view === "library" && activeFolder === f.path;
          return (
            <button key={f.path} className={`nav-item ${isActive ? "active" : ""}`} title={f.path} onClick={() => onFolderClick(f.path)}>
              <span className="ic"><FolderIcon size={15} /></span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
              <span className="count">{f.video_count.toLocaleString()}</span>
            </button>
          );
        })}
        <button className="nav-item" style={{ color: "var(--fg-dim)" }} onClick={onAddFolder}>
          <span className="ic"><PlusIcon size={15} /></span>
          <span>Add folder…</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="lib-stat"><span>INDEXED</span><b>{totalVideos.toLocaleString()}</b></div>
        <div className="lib-stat"><span>FOLDERS</span><b>{folders.length}</b></div>
      </div>
    </aside>
  );
}
