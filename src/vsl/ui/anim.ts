import {interpolate, spring} from 'remotion';
import {clamp, ease} from '../theme';

/** 0→1 entrance over `dur` frames starting at `at`. */
export const enter = (f: number, at: number, dur = 18, e = ease.out) =>
  interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: e});

/** 1→0 exit over `dur` frames starting at `at`. */
export const exit = (f: number, at: number, dur = 12, e = ease.in) =>
  interpolate(f, [at, at + dur], [1, 0], {...clamp, easing: e});

/** Visible window: fades in at `a`, out at `b`. */
export const win = (f: number, a: number, b: number, fin = 12, fout = 10) =>
  Math.min(enter(f, a, fin), exit(f, b - fout, fout));

export const pop = (f: number, at: number, fps: number, damping = 12, mass = 0.6) =>
  spring({frame: f - at, fps, config: {damping, mass, stiffness: 180}});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic pseudo random */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
