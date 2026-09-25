import type {EditSpec, StyleProfile} from '../../src/lab/types';

export type Job = {
  id: string; kind: string; target: string; status: 'running' | 'done' | 'error'; step: string;
  log: string[]; progress: number | null; costUsd: number; error: string | null; startedAt: number; endedAt?: number;
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
};
export type Plan = {
  subject: {fx: number; fy: number};
  dropWords: {from: number; to: number; reason: string}[];
  emphasis: {w: number; kind: string}[];
  callouts: {w: number; text: string; durationSec: number}[];
  sfx: {w: number; name: string}[];
  notes: string;
};
export type State = {styles: StyleMeta[]; projects: ProjectMeta[]; music: {name: string; url: string}[]; running: {id: string; target: string; step: string}[]};
export type StyleDetail = {meta: StyleMeta; style: StyleProfile | null};
export type ProjectDetail = {meta: ProjectMeta; style: StyleProfile; plan: Plan | null; spec: EditSpec | null; renders: {name: string; url: string; size: number}[]; words: number};

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
