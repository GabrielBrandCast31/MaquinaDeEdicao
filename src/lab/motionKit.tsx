// Toolkit for AI-written motion scenes (src/lab/motion/<project>/*.tsx).
// Scenes import ONLY from 'remotion', 'react' and this file.
import {Audio} from '@remotion/media';
import React, {createContext, useContext} from 'react';
import {Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {fontFamily} from './fonts';
import {SFX_MAX_SEC, type FontName, type SfxName} from './types';

export type {CamMode, MotionScene, SceneProps} from './types';
export {fontFamily};

/** Base URL for Lab media (empty in the Lab UI, http://localhost:4747 when rendering). */
export const LabBase = createContext('');

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
};
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0→1 progress between local frames a and b (eased, clamped). */
export const progress = (frame: number, a: number, b: number, easing = ease.out) => interpolate(frame, [a, b], [0, 1], {...clamp, easing});

/** Spring 0→1 starting at `delay` frames. */
export const pop = (frame: number, fps: number, delay = 0, damping = 14) => spring({frame: frame - delay, fps, config: {damping, mass: 0.7}});

/** Fade-out multiplier for the last `frames` frames of a scene. */
export const useExit = (durationInFrames: number, frames = 8) => {
  const f = useCurrentFrame();
  return interpolate(f, [durationInFrames - frames, durationInFrames], [1, 0], clamp);
};

/** Local frame at which a spoken word starts (first match, accent/case-insensitive), or fallback. */
export const wordFrame = (words: {t: string; f: number}[], text: string, fallback = 0) => {
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9$%]/g, '');
  return words.find((w) => n(w.t).includes(n(text)))?.f ?? fallback;
};

/** Sound effect at a local frame. Names and what each sounds like: src/lab/sfx.ts. */
export const Sfx: React.FC<{at: number; name: SfxName; volume?: number}> = ({at, name, volume = 0.5}) => {
  const base = useContext(LabBase);
  const {fps} = useVideoConfig();
  return (
    <Sequence from={Math.max(0, Math.round(at))} durationInFrames={fps * SFX_MAX_SEC} layout="none" name={`sfx:${name}`}>
      <Audio src={`${base}/static/sfx/${name}.wav`} volume={() => volume} />
    </Sequence>
  );
};

/** Text in one of the Lab fonts. */
export const Text: React.FC<{font?: FontName; weight?: number; size: number; color?: string; style?: React.CSSProperties; children: React.ReactNode}> = ({font = 'Montserrat', weight = 800, size, color = '#fff', style, children}) => (
  <div style={{fontFamily: fontFamily(font, weight), fontWeight: weight, fontSize: size, color, lineHeight: 1.05, ...style}}>{children}</div>
);
