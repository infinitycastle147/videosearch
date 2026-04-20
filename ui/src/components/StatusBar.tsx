interface StatusBarProps {
  indexing: boolean;
  totalVideos: number;
}

export default function StatusBar({ indexing, totalVideos }: StatusBarProps) {
  return (
    <div className="statusbar">
      {indexing ? (
        <>
          <div className="sb-item">
            <span className="spinner" />
            <span>Indexing…</span>
          </div>
          <div className="sb-item">
            <div className="bar"><div className="fill" style={{ width: "60%" }} /></div>
          </div>
        </>
      ) : (
        <>
          <div className="sb-item">
            <span className="dot" />
            <span>Index up to date</span>
          </div>
          <div className="sb-item">
            <span>{totalVideos.toLocaleString()} files</span>
          </div>
        </>
      )}
      <div className="right">
        <div className="sb-item"><span>CLIP-L/14 · local</span></div>
        <div className="sb-item"><span>v0.8</span></div>
      </div>
    </div>
  );
}
