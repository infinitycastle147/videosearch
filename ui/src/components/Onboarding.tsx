import { useState } from "react";
import { BoltIcon, CheckIcon, HDDIcon, SearchIcon, CopyIcon, UploadIcon, FolderIcon, ChevronRightIcon, BackIcon } from "./Icons";

interface OnboardingProps {
  onFinish: () => void;
  onAddFolder: (paths: string[]) => Promise<unknown>;
}

const suggested = [
  { name: "Pictures",  path: "~/Pictures",  size: "—",    count: null },
  { name: "Movies",    path: "~/Movies",    size: "—",    count: null },
  { name: "Downloads", path: "~/Downloads", size: "—",    count: null },
];

export default function Onboarding({ onFinish, onAddFolder }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [folders, setFolders] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [indexing, setIndexing] = useState(false);

  const steps = [
    { n: 1, label: "Welcome" },
    { n: 2, label: "Add your media" },
    { n: 3, label: "Index & search" },
  ];

  const toggleFolder = (p: string) => {
    setFolders(f => f.includes(p) ? f.filter(x => x !== p) : [...f, p]);
  };

  const handleContinue = async () => {
    if (step === 1) {
      setIndexing(true);
      await onAddFolder(folders);
      setIndexing(false);
      setStep(2);
    } else {
      setStep(s => Math.min(s + 1, 2));
    }
  };

  const next = () => setStep(s => Math.min(s + 1, 2));
  const back = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", padding: "40px 32px", overflow: "auto" }}>
      <div style={{ width: "min(680px, 100%)", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Stepper */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: i <= step ? "var(--fg)" : "var(--fg-dim)" }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9,
                  display: "grid", placeItems: "center",
                  background: i < step ? "var(--accent)" : i === step ? "var(--accent-bg)" : "transparent",
                  border: i === step ? "1px solid var(--accent)" : "1px solid var(--border)",
                  color: i < step ? "var(--accent-fg)" : "inherit",
                  fontSize: 10, fontWeight: 600,
                }}>
                  {i < step ? <CheckIcon size={10} /> : s.n}
                </div>
                <span style={{ letterSpacing: "0.02em" }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div style={{ width: 32, height: 1, background: "var(--border)" }} />}
            </div>
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div style={{ textAlign: "center", border: "1px solid var(--border)", borderRadius: 14, padding: "52px 40px 44px", background: "var(--bg)" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent-bg)", color: "var(--accent)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
              <BoltIcon size={26} />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
              Search your media in plain English.
            </h1>
            <p style={{ margin: "10px auto 0", maxWidth: 460, color: "var(--fg-muted)", lineHeight: 1.55, fontSize: 14 }}>
              VideoSearch builds a local index of every image and video on your machine — then lets you find any frame, clip, or photo by describing it. Nothing leaves your device.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 32, textAlign: "left" }}>
              {[
                { ic: <HDDIcon size={14} />,    t: "Local-only",      d: "No cloud uploads. Fully on-device model." },
                { ic: <SearchIcon size={14} />, t: "Natural language", d: "Describe people, scenes, objects, text." },
                { ic: <CopyIcon size={14} />,   t: "Deduplicate",     d: "Find exact & near-duplicate media." },
              ].map(f => (
                <div key={f.t} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 12px 14px", background: "var(--bg-2)" }}>
                  <div style={{ color: "var(--accent)", marginBottom: 6 }}>{f.ic}</div>
                  <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 2 }}>{f.t}</div>
                  <div style={{ color: "var(--fg-muted)", fontSize: 12, lineHeight: 1.4 }}>{f.d}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn primary" onClick={next}>Get started<ChevronRightIcon size={13} /></button>
            </div>
          </div>
        )}

        {/* Step 1: Add folders */}
        {step === 1 && (
          <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg)", overflow: "hidden" }}>
            <div style={{ padding: "24px 28px 0" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Add folders to index</h2>
              <p style={{ margin: "4px 0 0", color: "var(--fg-muted)", fontSize: 13 }}>
                Pick as many as you like. You can add or remove folders later.
              </p>
            </div>
            <div style={{ padding: "20px 28px" }}>
              <div
                onDragEnter={() => setDrag(true)}
                onDragLeave={() => setDrag(false)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  setDrag(false);
                  const files = Array.from(e.dataTransfer.files);
                  const paths = files.map(f => (f as { path?: string }).path || f.name).filter(Boolean);
                  if (paths.length) setFolders(prev => [...new Set([...prev, ...paths])]);
                }}
                style={{
                  border: `1.5px dashed ${drag ? "var(--accent)" : "var(--border-strong)"}`,
                  background: drag ? "var(--accent-bg)" : "var(--bg-2)",
                  borderRadius: 10, padding: "24px 20px", textAlign: "center", transition: "all .12s",
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", display: "grid", placeItems: "center", margin: "0 auto 10px", color: "var(--fg-muted)" }}>
                  <UploadIcon size={16} />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Drop folders here</div>
                <div style={{ color: "var(--fg-muted)", fontSize: 12.5, marginTop: 4 }}>
                  or drag from Finder
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-dim)", fontWeight: 600, marginBottom: 8 }}>Suggested</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {suggested.map(s => {
                    const on = folders.includes(s.path);
                    return (
                      <button key={s.path} onClick={() => toggleFolder(s.path)} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
                        border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                        background: on ? "var(--accent-bg)" : "var(--bg-2)",
                        borderRadius: 8, textAlign: "left", transition: "all .1s",
                      }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1.5px solid var(--border-strong)", display: "grid", placeItems: "center", color: "var(--accent-fg)" }}>
                          {on && <CheckIcon size={10} />}
                        </div>
                        <FolderIcon size={14} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.path}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 28px", borderTop: "1px solid var(--border)", background: "var(--bg-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                {folders.length ? <><b style={{ color: "var(--fg)" }}>{folders.length}</b> folder{folders.length !== 1 ? "s" : ""} selected</> : "No folders selected"}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn ghost" onClick={back}><BackIcon size={13} /> Back</button>
                <button className="btn primary" onClick={handleContinue} disabled={folders.length === 0 || indexing}>
                  {indexing ? "Indexing…" : "Continue"}<ChevronRightIcon size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Ready */}
        {step === 2 && (
          <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg)", padding: "32px 28px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent-bg)", color: "var(--accent)", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
              <CheckIcon size={22} />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>You're all set.</h2>
            <p style={{ margin: "8px auto 18px", maxWidth: 420, color: "var(--fg-muted)", fontSize: 13.5 }}>
              Indexing runs in the background. You can start searching as soon as the first batch completes.
            </p>
            <div style={{ marginTop: 24 }}>
              <button className="btn primary" onClick={onFinish}>Open library <ChevronRightIcon size={13} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
