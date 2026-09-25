import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, ease} from '../theme';

const P: Record<string, string[]> = {
  instagram: ['M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z', 'M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z', 'M17.2 6.6h.01'],
  users: ['M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20', 'M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35', 'M15.5 4.6a3.5 3.5 0 0 1 0 6.8'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],
  heart: ['M20.4 5.6a5 5 0 0 0-7.1 0L12 6.9l-1.3-1.3a5 5 0 0 0-7.1 7.1L12 21l8.4-8.3a5 5 0 0 0 0-7.1z'],
  comment: ['M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.3A8.5 8.5 0 1 1 21 11.5z'],
  share: ['M22 2 11 13', 'M22 2 15 22l-4-9-9-4 20-7z'],
  trend: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
  calendar: ['M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M16 3v4', 'M8 3v4', 'M3 11h18'],
  form: ['M6 3h9l5 5v13H6z', 'M14 3v6h6', 'M9 13h7', 'M9 17h5'],
  video: ['M15 10l5-3v10l-5-3', 'M4 6h11v12H4z'],
  expert: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M5 21v-1a7 7 0 0 1 14 0v1', 'M16.5 3.5l1.5 1.5 3-3'],
  check: ['M4 12.5l5 5L20 6.5'],
  profile: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  bio: ['M4 5h16', 'M4 10h16', 'M4 15h10', 'M4 20h6'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  play: ['M6 4l14 8-14 8z'],
  retention: ['M3 20h18', 'M3 6c4 0 5 3 8 6s5 5 10 5'],
  method: ['M12 2l3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 9l6-1z'],
  strategy: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M12 12l7-7'],
  analysis: ['M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z', 'M20 20l-4-4', 'M8 13l2-2 2 2 2-3'],
  result: ['M8 21h8', 'M12 17v4', 'M7 4h10v5a5 5 0 0 1-10 0z', 'M17 5h3v2a3 3 0 0 1-3 3', 'M7 5H4v2a3 3 0 0 0 3 3'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  clock: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 7v5l3 2'],
  tooth: ['M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 4.5 2 7 .5 3 1 6.5 3 6.5s2-4 4-4 2 4 4 4 2.5-3.5 3-6.5c.5-2.5 2-4 2-7C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z'],
  briefcase: ['M3 8h18v12H3z', 'M9 8V5h6v3', 'M3 13h18'],
  alert: ['M12 3l10 18H2z', 'M12 10v4', 'M12 17.5h.01'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  book: ['M4 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4z', 'M20 4h-5a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h6z'],
  bolt: ['M13 2L4 14h7l-1 8 9-12h-7z'],
  target: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z', 'M12 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2z'],
};
export type IconName = keyof typeof P;

/** Line icon that draws itself on, then idles with a subtle float. */
export const Icon: React.FC<{name: IconName; size?: number; color?: string; at?: number; stroke?: number; glow?: boolean; idle?: boolean; style?: React.CSSProperties}> = ({
  name, size = 64, color = C.violetLight, at = 0, stroke = 1.7, glow = true, idle = true, style,
}) => {
  const f = useCurrentFrame();
  const d = interpolate(f, [at, at + 20], [1, 0], {...clamp, easing: ease.out});
  const s = interpolate(f, [at, at + 14], [0.6, 1], {...clamp, easing: ease.back});
  const o = interpolate(f, [at, at + 6], [0, 1], clamp);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{overflow: 'visible', opacity: o, scale: String(s), translate: idle ? `0 ${Math.sin((f - at) / 18) * size * 0.03}px` : undefined, filter: glow ? `drop-shadow(0 0 ${size / 6}px ${color}88)` : undefined, ...style}}>
      {P[name].map((p, i) => (
        <path key={i} d={p} pathLength={1} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={Math.min(1, d + i * 0.08)} />
      ))}
    </svg>
  );
};

/** Icon inside a glass tile. */
export const IconTile: React.FC<{name: IconName; size?: number; color?: string; at?: number}> = ({name, size = 120, color = C.violetLight, at = 0}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 16], [0, 1], {...clamp, easing: ease.back});
  return (
    <div style={{width: size, height: size, borderRadius: size * 0.28, background: `linear-gradient(145deg, ${color}26, rgba(255,255,255,0.03))`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: String(p), opacity: p, boxShadow: `0 20px 60px -20px ${color}66, inset 0 1px 0 rgba(255,255,255,0.12)`}}>
      <Icon name={name} size={size * 0.5} color={color} at={at + 4} />
    </div>
  );
};
