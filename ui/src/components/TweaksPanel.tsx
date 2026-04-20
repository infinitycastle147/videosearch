import { XIcon, SunIcon, MoonIcon } from "./Icons";

interface TweaksPanelProps {
  open: boolean;
  onClose: () => void;
  theme: string;
  setTheme: (t: string) => void;
}

export default function TweaksPanel({ open, onClose, theme, setTheme }: TweaksPanelProps) {
  if (!open) return null;
  return (
    <div className="tweaks-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Tweaks</h3>
        <button className="icon-btn" onClick={onClose} style={{ width: 22, height: 22 }}>
          <XIcon size={12} />
        </button>
      </div>
      <div className="tweak-row">
        <span>Theme</span>
        <div className="theme-switch">
          <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}>
            <SunIcon size={11} />Light
          </button>
          <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>
            <MoonIcon size={11} />Dark
          </button>
        </div>
      </div>
    </div>
  );
}
