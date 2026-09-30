import type React from 'react';
import {SFX_LIBRARY} from './sfx';
// Shared contract between the Lab server (lab/lib/*.mjs), the Lab UI and the LabEdit composition.
// Keep enums in sync with lab/lib/schemas.mjs (the SFX list is shared through ./sfx.ts).

export const ASPECTS = {
  '9:16': {width: 1080, height: 1920},
  '16:9': {width: 1920, height: 1080},
  '1:1': {width: 1080, height: 1080},
  '4:5': {width: 1080, height: 1350},
} as const;
export type Aspect = keyof typeof ASPECTS;

export const FONTS = [
  'Montserrat', 'Poppins', 'Inter', 'Anton', 'BebasNeue', 'Oswald', 'Sora',
  'ArchivoBlack', 'Bangers', 'Roboto', 'LeagueSpartan', 'Outfit', 'DMSans', 'PlayfairDisplay',
] as const;
export type FontName = (typeof FONTS)[number];

export type SfxName = (typeof SFX_LIBRARY)[number]['name'];
export const SFX: readonly SfxName[] = SFX_LIBRARY.map((s) => s.name);
/** Longest sound in public/sfx is ~9 s; audio sequences are sized to fit any of them. */
export const SFX_MAX_SEC = 10;

export type StyleProfile = {
  name: string;
  summary: string;
  format: {aspect: Aspect; fps: number};
  pacing: {
    removeSilences: boolean;
    /** Pauses longer than this are cut out (seconds). */
    maxPauseSec: number;
    padBeforeSec: number;
    padAfterSec: number;
  };
  camera: {
    baseZoom: number;
    /** Zoom change on every jump cut. */
    zoomOnCut: 'none' | 'alternate' | 'random';
    cutZoomScale: number;
    /** Emphasis punch-in multiplier. */
    punchScale: number;
    punchStyle: 'cut' | 'smooth';
    punchHoldSec: number;
    /** Extra zoom per 10 s inside a clip (0 = off). */
    slowPushIn: number;
    shakeOnPunch: boolean;
  };
  captions: {
    enabled: boolean;
    mode: 'word-by-word' | 'phrase' | 'karaoke';
    wordsPerCaption: number;
    /** Vertical center of the caption block, % of height. */
    yPct: number;
    font: FontName;
    weight: number;
    /** Font size, % of the shorter video side. */
    sizePct: number;
    uppercase: boolean;
    color: string;
    highlightColor: string;
    highlight: 'active-word' | 'keywords' | 'none';
    activeWordBox: boolean;
    strokeColor: string;
    strokeWidth: number;
    shadow: boolean;
    box: {enabled: boolean; color: string; opacity: number; radius: number};
    animation: 'pop' | 'slide-up' | 'fade' | 'bounce' | 'none';
  };
  callouts: {
    enabled: boolean;
    style: 'bold-center' | 'lower-third' | 'sticker';
    font: FontName;
    color: string;
    accentColor: string;
    frequency: 'low' | 'medium' | 'high';
  };
  transitions: {type: 'none' | 'flash' | 'whip' | 'zoom-blur' | 'glitch'; every: number};
  grade: {contrast: number; saturation: number; brightness: number; warmth: number; vignette: number; grain: number};
  progressBar: {enabled: boolean; color: string; position: 'top' | 'bottom'};
  audio: {
    music: {enabled: boolean; volume: number; duckUnderVoice: boolean};
    sfx: {onCut: SfxName | null; onPunch: SfxName | null; onCallout: SfxName | null; volume: number};
  };
  notes: string[];
};

/** How the talking-head footage is framed while a motion scene is on screen. */
export type CamMode = 'full' | 'hidden' | 'pip-right' | 'pip-left' | 'pip-top' | 'bubble';

/** Props every AI-written motion scene receives (frames are local to the scene: 0 = scene start). */
export type SceneProps = {
  durationInFrames: number;
  width: number;
  height: number;
  fps: number;
  /** Spoken words inside the scene, with local frames — use them to sync animation to speech. */
  words: {t: string; f: number; e: number}[];
  style: StyleProfile;
};

/**
 * A motion scene written by the AI in src/lab/motion/<project>/*.tsx.
 * Timing is anchored to transcript word indices (raw `ri`), so it survives re-cuts.
 */
export type MotionScene = {
  id: string;
  /** Raw transcript index of the word where the scene starts. */
  startWord: number;
  /** Raw index of the last word covered (scene ends when it finishes). Use this or durationSec. */
  endWord?: number;
  durationSec?: number;
  /** full = replaces the footage (camera per `camera`); over = transparent overlay on top of the footage. */
  layer: 'full' | 'over';
  camera?: CamMode;
  hideCaptions?: boolean;
  Component: React.FC<SceneProps>;
};

/** Everything below is in OUTPUT-timeline frames. Media URLs are relative to `base`. */
export type EditSpec = {
  version: 1;
  /** Project id: selects the AI-written motion module in src/lab/motion. */
  projectId?: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  src: {url: string; width: number; height: number};
  subject: {fx: number; fy: number};
  clips: {from: number; dur: number; trimBefore: number}[];
  /** `ri` = index in the raw transcript (what motion scenes and the plan reference). */
  words: {t: string; f: number; e: number; hl?: boolean; ri: number}[];
  captions: {a: number; b: number; w0: number; w1: number}[];
  punches: {f: number; dur: number}[];
  callouts: {f: number; dur: number; text: string}[];
  transitions: {f: number}[];
  /** src = where the sound came from (cut / punch / callout / plan), used by the effects list. */
  sfx: {f: number; name: SfxName; volume: number; src?: 'cut' | 'punch' | 'callout' | 'plan'}[];
  music: {url: string; volume: number} | null;
  style: StyleProfile;
};

export type LabProps = {
  spec: EditSpec | null;
  specUrl?: string | null;
  base?: string;
  /** Replaces the project's registered motion scenes (used by the Lab's effects library demos). */
  scenes?: MotionScene[];
};
