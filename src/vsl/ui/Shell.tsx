import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, ease} from '../theme';
import {Backdrop} from './Backdrop';

export type Tx = 'zoom' | 'blur' | 'whipL' | 'whipR' | 'iris' | 'rise' | 'depth' | 'wipe' | 'cut';

const styleFor = (tx: Tx, p: number, dir: 1 | -1): React.CSSProperties => {
  // p: 0 = hidden, 1 = settled. dir: 1 = entering, -1 = leaving
  const q = 1 - p;
  switch (tx) {
    case 'zoom': return {scale: String(dir === 1 ? 1.25 - 0.25 * p : 1 + q * 0.18), opacity: p, filter: `blur(${q * 16}px)`};
    case 'blur': return {opacity: p, filter: `blur(${q * 30}px)`};
    case 'whipL': return {translate: `${q * 1400 * dir}px 0`, filter: `blur(${q * 40}px)`, opacity: Math.min(1, p * 2)};
    case 'whipR': return {translate: `${-q * 1400 * dir}px 0`, filter: `blur(${q * 40}px)`, opacity: Math.min(1, p * 2)};
    case 'iris': return {clipPath: `circle(${p * 75}% at 50% 50%)`};
    case 'rise': return {translate: `0 ${q * 200 * dir}px`, opacity: p, filter: `blur(${q * 12}px)`};
    case 'depth': return {scale: String(dir === 1 ? 0.8 + 0.2 * p : 1 + q * 0.3), opacity: p, rotate: `${q * -4}deg`};
    case 'wipe': return {clipPath: dir === 1 ? `inset(0 ${q * 100}% 0 0)` : `inset(0 0 0 ${q * 100}%)`};
    default: return {};
  }
};

/** Motion scene container with its own entrance / exit transition and optional premium backdrop. */
export const Shell: React.FC<{children: React.ReactNode; tin?: Tx; tout?: Tx; bg?: boolean | 'violet' | 'mint' | 'coral' | 'neutral'; din?: number; dout?: number; grid?: boolean}> = ({
  children, tin = 'zoom', tout = 'blur', bg = false, din = 14, dout = 10, grid = true,
}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const pin = tin === 'cut' ? 1 : interpolate(f, [0, din], [0, 1], {...clamp, easing: ease.out});
  const pout = tout === 'cut' ? 1 : interpolate(f, [durationInFrames - dout, durationInFrames], [1, 0], {...clamp, easing: ease.in});
  const st = pout < 1 ? styleFor(tout, pout, -1) : styleFor(tin, pin, 1);
  return (
    <AbsoluteFill style={st}>
      {bg ? <Backdrop hue={bg === true ? 'violet' : bg} grid={grid} /> : null}
      {children}
    </AbsoluteFill>
  );
};
