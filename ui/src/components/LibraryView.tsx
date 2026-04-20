import Thumb from "./Thumb";
import { VideoIcon, ImageIcon, FolderIcon } from "./Icons";
import { getThumbnailUrl } from "../lib/api";
import type { MediaFile, LibraryFolder } from "../lib/api";
import type { SearchResult } from "../lib/api";

const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button className={`pill ${on ? "on" : ""}`} onClick={onClick}>{children}</button>
);

interface LibraryViewProps {
  files: MediaFile[];
  loading: boolean;
  error: string | null;
  folder: string | null;
  setFolder: (f: string | null) => void;
  folders: LibraryFolder[];
  onOpenResult: (r: SearchResult) => void;
}

export default function LibraryView({ files, loading, error, folder, setFolder, folders, onOpenResult }: LibraryViewProps) {
  const handleOpen = (f: MediaFile) => {
    onOpenResult({
      file: f.file,
      video_dir: f.video_dir,
      best_score: 1,
      timestamps: [],
    });
  };

  if (folders.length === 0) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 32 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bg-active)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "var(--fg-dim)" }}>
            <FolderIcon size={22} />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>No folders indexed</h2>
          <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: 13, lineHeight: 1.55 }}>
            Add folders from the sidebar to start indexing your media.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Library</div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 2 }}>
          All media
          <span style={{ marginLeft: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)", fontWeight: 400 }}>
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Folder filter pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Pill on={folder === null} onClick={() => setFolder(null)}>All</Pill>
        {folders.map(f => {
          const name = f.path.split("/").pop() || f.path;
          return (
            <Pill key={f.path} on={folder === f.path} onClick={() => setFolder(f.path)}>
              {name}
            </Pill>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ height: 200, display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 28, height: 28, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
            <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>Loading…</div>
          </div>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--danger)", fontSize: 13 }}>{error}</div>
      ) : files.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-muted)", fontSize: 13 }}>
          No files in {folder ? `"${folder.split("/").pop()}"` : "library"}.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {files.map(f => (
            <button
              key={`${f.video_dir}/${f.file}`}
              onClick={() => handleOpen(f)}
              style={{ display: "flex", flexDirection: "column", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", textAlign: "left", padding: 0, transition: "border-color .1s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
            >
              <Thumb src={getThumbnailUrl(f.file)} ratio="16 / 10">
                <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.04em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {f.type === "video" ? <VideoIcon size={10} /> : <ImageIcon size={10} />}
                  {f.type}
                </div>
              </Thumb>
              <div style={{ padding: "10px 12px 12px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.file}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.video_dir}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
