export default function Titlebar() {
  return (
    <div className="titlebar">
      <div className="win-ctrls">
        <div className="win-ctrl close" />
        <div className="win-ctrl" />
        <div className="win-ctrl" />
      </div>
      <div className="brand">
        <span className="brand-mark" />
        VideoSearch
      </div>
      <div className="titlebar-spacer" />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-dim)' }}>
        local · private
      </div>
    </div>
  );
}
