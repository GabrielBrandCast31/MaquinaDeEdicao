import type {EditSpec, StyleProfile} from '../../src/lab/types';

export type JobStep = {label: string; status: 'running' | 'done' | 'error'; progress: number | null; startedAt: number; endedAt?: number; waiting?: string | null; parallel?: boolean};
export type Job = {
  id: string; kind: string; target: string; status: 'running' | 'done' | 'error'; step: string; steps?: JobStep[];
  log: string[]; progress: number | null; waiting?: string | null; costUsd: number; error: string | null; startedAt: number; endedAt?: number;
};
export type Stats = Record<string, number | string | null>;
export type StyleMeta = {
  id: string; name: string; source?: string; sourceName?: string; video?: string; analyzed?: boolean; job?: string;
  costUsd?: number; stats?: Stats; images?: {url: string; kind: string; label: string}[]; updatedAt?: number;
};
export type ProjectMeta = {
  id: string; name: string; source?: string; sourceName?: string; video?: string; styleId?: string | null; styleName?: string;
  music?: string | null; built?: boolean; durationSec?: number; clips?: number; job?: string; costUsd?: number;
  chat?: {role: 'user' | 'ai'; text: string}[]; updatedAt?: number;
  motionPrompt?: string; motionEnabled?: boolean;
  stage?: 'draft' | 'sampling' | 'sample-ready' | 'full' | 'done';
  sample?: {startSec: number; lenSec: number; from?: number; to?: number; url?: string};
  finalUrl?: string;
  /** Transcript supplied by the user (otherwise Whisper transcribes). `timed: false` = plain text aligned by Whisper. */
  transcript?: {name: string; kind: 'srt' | 'vtt' | 'json' | 'txt'; timed: boolean; words: number} | null;
};
export type Plan = {
  subject: {fx: number; fy: number};
  dropWords: {from: number; to: number; reason: string}[];
  emphasis: {w: number; kind: string}[];
  callouts: {w: number; text: string; durationSec: number}[];
  sfx: {w: number; name: string}[];
  notes: string;
};
export type State = {styles: StyleMeta[]; projects: ProjectMeta[]; music: {name: string; url: string}[]; running: RunningJob[]};
export type RunningJob = {id: string; target: string; kind: string; name: string; step: string; waiting: string | null; progress: number | null; startedAt: number};
export type StyleDetail = {meta: StyleMeta; style: StyleProfile | null};
export type Footage = {url: string; width: number; height: number; duration: number; name: string};
export type Library = {sfx: Record<string, {sec: number; peaks: number[]} | null>; footage: Footage | null; baseStyle: StyleProfile};
export type EffectsReport = {
  title: string;
  sounds: {edit: {at: string; name: string; label: string; source: string}[]; motion: {at: string; scene: string; names: string[]}[]; counts: Record<string, number>; music: {name: string; volume: number} | null};
  visuals: {group: string; label: string; detail: string; times: string[]}[];
  motion: {at: string; until: string; id: string; layer: string; camera: string; what: string; sfx: string[]}[];
  text: string;
};
export type Render = {name: string; url: string; size: number; report: EffectsReport | null; reportUrl: string | null};
export type ProjectDetail = {meta: ProjectMeta; style: StyleProfile; plan: Plan | null; spec: EditSpec | null; renders: Render[]; words: number};
export type Brief = {
  overview?: string; audience?: string; tone?: string; visual?: string; notes?: string;
  sections?: {fromWord: number; toWord: number; topic: string; intent: string}[];
  blocks?: {index: number; fromSec: number; toSec: number; focus: string; avoid: string; bridge: string}[];
};
export type BriefDetail = {brief: Brief; parent: string};

const call = async <T,>(method: string, url: string, body?: unknown): Promise<T> => {
  const res = await fetch(url, {method, headers: body ? {'Content-Type': 'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
  return data as T;
};

export const api = {
  get: <T,>(url: string) => call<T>('GET', url),
  post: <T,>(url: string, body: unknown = {}) => call<T>('POST', url, body),
  put: <T,>(url: string, body: unknown) => call<T>('PUT', url, body),
  del: <T,>(url: string) => call<T>('DELETE', url),
  /** Streams a file to the server (raw body) with upload progress. */
  upload: (url: string, file: File, onProgress: (p: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(JSON.parse(xhr.responseText || '{}').error ?? `Erro ${xhr.status}`)));
      xhr.onerror = () => reject(new Error('Falha no envio'));
      xhr.send(file);
    }),
};

export const fmtUsd = (n?: number) => `US$ ${(n ?? 0).toFixed(2)}`;
export const fmtSec = (s?: number | null) => (s == null ? '–' : s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${s.toFixed(1)}s`);
export const fmtMb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
