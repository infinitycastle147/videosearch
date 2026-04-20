import { useState } from "react";
import Thumb from "./Thumb";
import { CheckIcon, ChevronRightIcon, ChevronDownIcon, EyeIcon, FolderIcon, TrashIcon, InfoIcon } from "./Icons";
import { getThumbnailUrl } from "../lib/api";
import type { DuplicateGroup } from "../lib/api";

const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button className={`pill ${on ? "on" : ""}`} onClick={onClick}>{children}</button>
);

interface DuplicatesViewProps {
  groups: DuplicateGroup[];
  loading: boolean;
  error: string | null;
  scanned: boolean;
  onScan: () => void;
}

export default function DuplicatesView({ groups, loading, error, scanned, onScan }: DuplicatesViewProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [keep, setKeep] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    groups.forEach(g => g.files.forEach((f, i) => { m[`${g.video_dir}/${f}`] = i === 0; }));
    return m;
  });
  const [filter, setFilter] = useState("all");

  const setKeepFile = (group: DuplicateGroup, filename: string) => {
    setKeep(prev => {
      const next = { ...prev };
      group.files.forEach(f => { next[`${group.video_dir}/${f}`] = f === filename; });
      return next;
    });
  };

  const similarityPct = (g: DuplicateGroup) => Math.round(g.similarity * 100);

  const filtered = filter === "all" ? groups : groups.filter(g => {
    if (filter === "exact") return g.similarity >= 1;
    return g.similarity < 1;
  });

  const totalDelete = filtered.reduce((a, g) => a + g.files.filter(f => !keep[`${g.video_dir}/${f}`]).length, 0);

  if (!scanned) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 32 }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--bg-active)", display: "grid", placeItems: "center", margin: "0 auto 20px", color: "var(--fg-muted)" }}>
            <EyeIcon size={24} />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>Find duplicates</h2>
          <p style={{ margin: "0 0 24px", color: "var(--fg-muted)", fontSize: 13, lineHeight: 1.55 }}>
            Scan your library for exact and near-duplicate images and videos to free up space.
          </p>
          <button className="btn primary" onClick={onScan} disabled={loading}>
            {loading ? "Scanning…" : "Scan library"}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>Scanning for duplicates…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--danger)" }}>
          <div style={{ fontSize: 13 }}>Scan failed: {error}</div>
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent-bg)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "var(--accent)" }}>
            <CheckIcon size={22} />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>No duplicates found</h2>
          <p style={{ margin: "0 0 20px", color: "var(--fg-muted)", fontSize: 13 }}>Your library is clean.</p>
          <button className="btn ghost" onClick={onScan}>Rescan</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 120px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Groups found",   value: filtered.length,  sub: `across ${filtered.reduce((a, g) => a + g.files.length, 0)} files`, color: null },
          { label: "To delete",      value: totalDelete,      sub: "you'll review each",        color: "var(--danger)" },
          { label: "Last scan",      value: "just now",       sub: "manual scan",               color: null },
        ].map((s, i) => (
          <div key={i} style={{ padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)" }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-dim)", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, letterSpacing: "-0.02em", color: s.color || "var(--fg)", fontFamily: "var(--font-mono)" }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-dim)", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Pill on={filter === "all"}   onClick={() => setFilter("all")}>All</Pill>
        <Pill on={filter === "exact"} onClick={() => setFilter("exact")}>Exact only</Pill>
        <Pill on={filter === "near"}  onClick={() => setFilter("near")}>Near-duplicates</Pill>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn danger">
            <TrashIcon size={13} /> Delete {totalDelete} selected
          </button>
        </div>
      </div>

      {/* Groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((g, gi) => {
          const pct = similarityPct(g);
          const isExpanded = !!expanded[gi];
          return (
            <div key={gi} style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg)", overflow: "hidden" }}>
              <button onClick={() => setExpanded(x => ({ ...x, [gi]: !x[gi] }))} style={{ width: "100%", display: "grid", gridTemplateColumns: "auto auto 1fr auto", gap: 14, alignItems: "center", padding: "12px 16px", background: "transparent", border: 0, textAlign: "left", borderBottom: isExpanded ? "1px solid var(--border)" : "none" }}>
                <div style={{ color: "var(--fg-dim)" }}>{isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}</div>
                <Thumb src={getThumbnailUrl(g.files[0])} ratio="1 / 1" style={{ width: 40, borderRadius: 4 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{g.files.length} files match</div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, padding: "2px 6px", borderRadius: 4, background: pct === 100 ? "var(--danger-bg)" : "var(--accent-bg)", color: pct === 100 ? "var(--danger)" : "var(--accent)", fontWeight: 600 }}>{pct}% similar</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-dim)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.files[0]}</div>
                </div>
                <ChevronRightIcon size={14} style={{ color: "var(--fg-dim)" }} />
              </button>

              {isExpanded && (
                <div style={{ padding: 16, background: "var(--bg-2)", display: "grid", gridTemplateColumns: `repeat(${Math.min(g.files.length, 4)}, 1fr)`, gap: 12 }}>
                  {g.files.map(f => {
                    const key = `${g.video_dir}/${f}`;
                    const isKept = keep[key] !== false;
                    return (
                      <div key={f} style={{ border: `2px solid ${isKept ? "var(--success)" : "var(--border)"}`, borderRadius: 10, background: "var(--bg)", overflow: "hidden", position: "relative", transition: "border-color .1s" }}>
                        <Thumb src={getThumbnailUrl(f)} ratio="4 / 3" style={{ borderRadius: 0 }}>
                          <div style={{ position: "absolute", top: 8, left: 8, background: isKept ? "var(--success)" : "rgba(0,0,0,0.55)", backdropFilter: isKept ? undefined : "blur(6px)", color: isKept ? "#0a1a12" : "#fff", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 4, letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {isKept ? <><CheckIcon size={10} /> KEEP</> : "DELETE"}
                          </div>
                        </Thumb>
                        <div style={{ padding: 12 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.video_dir}</div>
                          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                            {!isKept ? (
                              <button className="btn" style={{ flex: 1 }} onClick={() => setKeepFile(g, f)}>
                                <CheckIcon size={12} /> Keep this
                              </button>
                            ) : (
                              <button className="btn ghost" style={{ flex: 1, cursor: "default", background: "var(--bg-2)" }}>Keeping</button>
                            )}
                            <button className="icon-btn" title="Reveal"><FolderIcon size={13} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, padding: "16px 20px", border: "1px dashed var(--border-strong)", borderRadius: 10, background: "var(--bg)", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-bg)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <InfoIcon size={15} />
        </div>
        <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.55 }}>
          VideoSearch checks for duplicates using perceptual hashing. Deleted files are moved to your system Trash.
        </div>
      </div>
    </div>
  );
}
