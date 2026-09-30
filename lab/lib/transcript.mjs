// User-supplied transcripts: SRT / VTT / JSON (timed) or plain TXT (text only, aligned onto Whisper timings).
// Output is the same word list Whisper produces: [{t, start, end}] in seconds on the source timeline.
import fs from 'node:fs';
import path from 'node:path';

export const TRANSCRIPT_EXTS = ['.srt', '.vtt', '.json', '.txt'];

const bad = (msg) => Object.assign(new Error(msg), {status: 400});
const tokens = (text) => text.replace(/<[^>]+>|\{[^}]*\}/g, ' ').split(/\s+/).map((t) => t.trim()).filter((t) => t && !/^[-–—•♪]+$/.test(t));

/** Spreads the words of a timed segment across it, proportionally to their length. */
const spread = (text, start, end) => {
  const ws = tokens(text);
  if (!ws.length || !(end > start)) return [];
  const weights = ws.map((w) => w.length + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = start;
  return ws.map((w, i) => {
    const d = ((end - start) * weights[i]) / total;
    const word = {t: w, start: +t.toFixed(3), end: +(t + d).toFixed(3)};
    t += d;
    return word;
  });
};

const clock = (s) => {
  const m = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/.exec(s);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, '0')) / 1000;
};

/** SRT and WebVTT: blocks of "start --> end" followed by text lines. */
const parseCues = (src) => {
  const words = [];
  for (const block of src.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n');
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i < 0) continue;
    const [a, b] = lines[i].split('-->');
    const start = clock(a), end = clock(b);
    if (start === null || end === null) continue;
    words.push(...spread(lines.slice(i + 1).join(' '), start, end));
  }
  return words;
};

/** Our own format, Whisper-style {segments:[{words}]}, or any array of {text|word|t, start|startMs, end|endMs}. */
const parseJson = (src) => {
  let j;
  try { j = JSON.parse(src); } catch (e) { throw bad(`JSON inválido: ${e.message}`); }
  const items = Array.isArray(j) ? j : j.words ?? j.segments ?? j.transcription ?? j.captions ?? [];
  if (!Array.isArray(items)) throw bad('JSON sem lista de palavras ou segmentos');
  const flat = items.flatMap((s) => (Array.isArray(s.words) && s.words.length ? s.words : [s]));
  const sec = (x, ms) => (ms !== undefined ? Number(ms) / 1000 : typeof x === 'string' ? clock(x) ?? Number(x) : Number(x));
  const words = [];
  for (const it of flat) {
    const text = String(it.t ?? it.text ?? it.word ?? '').trim();
    // whisper.cpp JSON keeps times in milliseconds under `offsets`.
    const start = sec(it.start ?? it.from ?? it.start_time, it.startMs ?? it.start_ms ?? it.offsets?.from);
    const end = sec(it.end ?? it.to ?? it.end_time, it.endMs ?? it.end_ms ?? it.offsets?.to);
    if (!text || !Number.isFinite(start) || !Number.isFinite(end)) continue;
    const ws = tokens(text);
    words.push(...(ws.length === 1 ? [{t: ws[0], start, end}] : spread(text, start, end)));
  }
  return words;
};

/**
 * Reads an uploaded transcript. Timed formats return words; TXT returns only the text tokens
 * (they get their timing from Whisper later, see alignToTimings).
 */
export const readTranscript = (file) => {
  const ext = path.extname(file).toLowerCase();
  const src = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  if (ext === '.txt') {
    const text = tokens(src);
    if (!text.length) throw bad('O arquivo de texto está vazio');
    return {kind: 'txt', timed: false, text};
  }
  const words = (ext === '.json' ? parseJson(src) : parseCues(src)).sort((a, b) => a.start - b.start);
  if (!words.length) throw bad(`Não encontrei falas com tempo neste ${ext.slice(1).toUpperCase()}`);
  return {kind: ext.slice(1), timed: true, words};
};

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/**
 * Global alignment (Needleman–Wunsch) of the user's text onto Whisper's words: the text is the user's,
 * the timing is Whisper's. Words Whisper missed are spread over the gap between their aligned neighbours.
 */
export const alignToTimings = (text, heard) => {
  const n = text.length, m = heard.length;
  if (!m) throw new Error('O Whisper não ouviu fala neste vídeo para sincronizar o texto');
  if (n * m > 150e6) throw new Error('Texto longo demais para sincronizar (mais de ~2 h de fala). Envie um SRT com os tempos.');
  const A = text.map(norm), B = heard.map((w) => norm(w.t));
  const score = (a, b) => (a === b ? 2 : a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a)) ? 1 : -1);
  const GAP = -1;
  // Traceback: 0 = diagonal, 1 = skip a user word, 2 = skip a heard word.
  const trace = new Uint8Array((n + 1) * (m + 1));
  let prev = new Int32Array(m + 1), cur = new Int32Array(m + 1);
  for (let j = 0; j <= m; j++) { prev[j] = j * GAP; trace[j] = 2; }
  for (let i = 1; i <= n; i++) {
    cur[0] = i * GAP; trace[i * (m + 1)] = 1;
    for (let j = 1; j <= m; j++) {
      const d = prev[j - 1] + score(A[i - 1], B[j - 1]), u = prev[j] + GAP, l = cur[j - 1] + GAP;
      const best = d >= u && d >= l ? 0 : u >= l ? 1 : 2;
      cur[j] = best === 0 ? d : best === 1 ? u : l;
      trace[i * (m + 1) + j] = best;
    }
    [prev, cur] = [cur, prev];
  }
  const match = new Array(n).fill(-1);
  for (let i = n, j = m; i > 0 || j > 0;) {
    const t = i === 0 ? 2 : j === 0 ? 1 : trace[i * (m + 1) + j];
    if (t === 0) { match[i - 1] = j - 1; i--; j--; } else if (t === 1) i--; else j--;
  }
  const out = text.map((t, i) => (match[i] >= 0 ? {t, start: heard[match[i]].start, end: heard[match[i]].end} : {t, start: null, end: null}));
  // Unmatched runs: spread between the previous word's end and the next matched word's start.
  for (let i = 0; i < n; i++) {
    if (out[i].start !== null) continue;
    let k = i;
    while (k < n && out[k].start === null) k++;
    const from = i > 0 ? out[i - 1].end : Math.max(0, (out[k]?.start ?? heard[0].start) - 0.3 * (k - i));
    const to = k < n ? out[k].start : Math.max(from + 0.3 * (k - i), heard.at(-1).end);
    const step = Math.max(0.05, to - from) / (k - i);
    for (let x = i; x < k; x++) Object.assign(out[x], {start: +(from + (x - i) * step).toFixed(3), end: +(from + (x - i + 1) * step).toFixed(3)});
    i = k - 1;
  }
  return out;
};
