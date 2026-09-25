import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {clamp, ease} from '../theme';

/** Pointer that travels through keyframed points and clicks at given frames. */
export const Cursor: React.FC<{path: {f: number; x: number; y: number}[]; clicks?: number[]; scale?: number}> = ({path, clicks = [], scale = 1}) => {
  const f = useCurrentFrame();
  const fs = path.map((p) => p.f);
  const x = interpolate(f, fs, path.map((p) => p.x), {...clamp, easing: ease.inOut});
  const y = interpolate(f, fs, path.map((p) => p.y), {...clamp, easing: ease.inOut});
  const o = interpolate(f, [fs[0], fs[0] + 6], [0, 1], clamp);
  const press = clicks.reduce((acc, c) => Math.max(acc, interpolate(f, [c - 3, c, c + 5], [0, 1, 0], clamp)), 0);
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: o, pointerEvents: 'none', zIndex: 50}}>
      {clicks.map((c) => {
        const r = interpolate(f, [c, c + 18], [0, 1], clamp);
        return r > 0 && r < 1 ? <div key={c} style={{position: 'absolute', left: -40 * r * scale, top: -40 * r * scale, width: 80 * r * scale, height: 80 * r * scale, borderRadius: '50%', border: `3px solid rgba(255,255,255,${1 - r})`}} /> : null;
      })}
      <svg width={38 * scale} height={38 * scale} viewBox="0 0 24 24" style={{scale: String(1 - press * 0.18), filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))'}}>
        <path d="M4 2l16 9.5-7 1.5-3.5 7z" fill="white" stroke="#111" strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
};
