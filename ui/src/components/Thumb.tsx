import React, { useState } from "react";

const thumbStyles = [
  'linear-gradient(135deg, oklch(0.42 0.12 30) 0%, oklch(0.28 0.08 15) 40%, oklch(0.22 0.04 260) 100%)',
  'linear-gradient(160deg, oklch(0.55 0.14 155) 0%, oklch(0.32 0.08 170) 55%, oklch(0.18 0.03 200) 100%)',
  'linear-gradient(180deg, oklch(0.78 0.13 230) 0%, oklch(0.45 0.09 240) 55%, oklch(0.22 0.04 255) 100%)',
  'linear-gradient(145deg, oklch(0.35 0.05 280) 0%, oklch(0.22 0.03 260) 50%, oklch(0.14 0.02 250) 100%)',
  'linear-gradient(125deg, oklch(0.72 0.14 65) 0%, oklch(0.55 0.12 45) 50%, oklch(0.32 0.08 25) 100%)',
  'linear-gradient(165deg, oklch(0.62 0.15 200) 0%, oklch(0.42 0.10 220) 55%, oklch(0.25 0.05 240) 100%)',
  'linear-gradient(155deg, oklch(0.48 0.12 350) 0%, oklch(0.30 0.08 330) 60%, oklch(0.18 0.04 310) 100%)',
  'linear-gradient(175deg, oklch(0.85 0.04 100) 0%, oklch(0.55 0.06 90) 55%, oklch(0.32 0.04 80) 100%)',
  'linear-gradient(135deg, oklch(0.38 0.09 15) 0%, oklch(0.55 0.16 25) 45%, oklch(0.35 0.10 35) 100%)',
  'linear-gradient(145deg, oklch(0.72 0.12 135) 0%, oklch(0.50 0.10 150) 55%, oklch(0.28 0.05 165) 100%)',
];

interface ThumbProps {
  src?: string;
  idx?: number;
  ratio?: string;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export default function Thumb({ src, idx = 0, ratio = '16 / 9', style = {}, className = '', children, onClick }: ThumbProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const gradient = thumbStyles[idx % thumbStyles.length];

  return (
    <div
      className={`thumb ${className}`}
      style={{ aspectRatio: ratio, position: 'relative', overflow: 'hidden', borderRadius: 6, ...style }}
      onClick={onClick}
    >
      {src && !imgFailed ? (
        <img src={src} onError={() => setImgFailed(true)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div className="thumb-gradient" style={{ backgroundImage: gradient, position: 'absolute', inset: 0 }} />
      )}
      {/* subtle film grain */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.04) 1px, transparent 1px)',
        backgroundSize: '3px 3px',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}
