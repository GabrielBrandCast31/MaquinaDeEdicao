import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, ease} from '../theme';
import {lerp} from './anim';

type Box = {x: number; y: number; w: number; h: number; r: number; z: number; fx: number; fy: number; blur: number; dim: number; o: number};

export const MODES = {
  full: {x: 0, y: 0, w: 1920, h: 1080, r: 0, z: 1, fx: 0.5, fy: 0.5, blur: 0, dim: 1, o: 1},
  punch: {x: 0, y: 0, w: 1920, h: 1080, r: 0, z: 1.18, fx: 0.47, fy: 0.36, blur: 0, dim: 1, o: 1},
  close: {x: 0, y: 0, w: 1920, h: 1080, r: 0, z: 1.42, fx: 0.47, fy: 0.3, blur: 0, dim: 1, o: 1},
  soft: {x: 0, y: 0, w: 1920, h: 1080, r: 0, z: 1.08, fx: 0.47, fy: 0.4, blur: 14, dim: 0.32, o: 1},
  right: {x: 1190, y: 120, w: 620, h: 840, r: 40, z: 1.05, fx: 0.47, fy: 0.4, blur: 0, dim: 1, o: 1},
  left: {x: 110, y: 120, w: 620, h: 840, r: 40, z: 1.05, fx: 0.47, fy: 0.4, blur: 0, dim: 1, o: 1},
  bubble: {x: 1580, y: 730, w: 260, h: 260, r: 130, z: 1.5, fx: 0.47, fy: 0.3, blur: 0, dim: 1, o: 1},
  hidden: {x: 1580, y: 730, w: 260, h: 260, r: 130, z: 1.5, fx: 0.47, fy: 0.3, blur: 0, dim: 1, o: 0},
} satisfies Record<string, Box>;
export type Mode = keyof typeof MODES;
export type CamKey = {f: number; m: Mode; d?: number};

const at = (keys: CamKey[], f: number): Box => {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].f <= f) i++;
  const k = keys[i];
  const prev = i > 0 ? MODES[keys[i - 1].m] : MODES[k.m];
  const t = interpolate(f, [k.f, k.f + (k.d ?? 14)], [0, 1], {...clamp, easing: ease.inOut});
  const n = MODES[k.m];
  const o = {} as Box;
  (Object.keys(n) as (keyof Box)[]).forEach((key) => (o[key] = lerp(prev[key], n[key], t)));
  return o;
};

/** Frames the talking-head footage. Children are the edited video clips (1920x1080). */
export const Camera: React.FC<{keys: CamKey[]; children: React.ReactNode}> = ({keys, children}) => {
  const f = useCurrentFrame();
  const b = at(keys, f);
  const breathe = 1 + 0.012 * Math.sin(f / 55);
  const s = Math.max(b.w / 1920, b.h / 1080) * b.z * breathe;
  const vw = 1920 * s, vh = 1080 * s;
  const left = Math.min(0, Math.max(b.w - vw, b.w / 2 - b.fx * vw));
  const top = Math.min(0, Math.max(b.h - vh, b.h / 2 - b.fy * vh));
  const isCard = b.r > 2;
  return (
    <AbsoluteFill style={{opacity: b.o}}>
      <div style={{position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: b.r, overflow: 'hidden', boxShadow: isCard ? `0 40px 120px -20px rgba(0,0,0,0.85), 0 0 0 1.5px ${C.line}` : undefined}}>
        <div style={{position: 'absolute', left, top, width: vw, height: vh, filter: `blur(${b.blur}px) brightness(${b.dim}) contrast(1.06) saturate(1.06)`}}>
          <div style={{width: 1920, height: 1080, scale: String(s), transformOrigin: '0 0'}}>{children}</div>
        </div>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,6,12,0) 55%, rgba(7,6,12,0.55) 100%)', pointerEvents: 'none'}} />
      </div>
    </AbsoluteFill>
  );
};
