import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {toCaptions, transcribe as whisper} from '@remotion/install-whisper-cpp';
import {track} from './jobctx.mjs';
import {ROOT} from './store.mjs';

const WHISPER_PATH = path.join(ROOT, 'whisper.cpp');
const WHISPER_MODEL = 'large-v3-turbo';

/** Runs a process; resolves with {code, out, err}. Rejects on non-zero exit unless allowFail. */
export const run = (cmd, args, {onLine, allowFail = false, cwd = ROOT, input} = {}) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {cwd, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe']});
    track(p);
    let out = '', err = '';
    const feed = (buf, isErr) => {
      const s = buf.toString();
      if (isErr) err += s; else out += s;
      if (onLine) for (const l of s.split(/\r|\n/)) if (l.trim()) onLine(l);
    };
    p.stdout.on('data', (b) => feed(b, false));
    p.stderr.on('data', (b) => feed(b, true));
    if (input !== undefined) { p.stdin.write(input); p.stdin.end(); }
    p.on('error', reject);
    p.on('close', (code) => (code === 0 || allowFail ? resolve({code, out, err}) : reject(new Error(`${cmd} saiu com código ${code}: ${err.slice(-800)}`))));
  });

export const probe = async (file) => {
  const {out} = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  const j = JSON.parse(out);
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  if (!v) throw new Error('Arquivo sem trilha de vídeo');
  const rot = Math.abs(Number(v.tags?.rotate ?? v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0));
  const [w, h] = rot === 90 || rot === 270 ? [v.height, v.width] : [v.width, v.height];
  const [fn, fd] = String(v.avg_frame_rate || v.r_frame_rate || '30/1').split('/').map(Number);
  return {duration: Number(j.format.duration), width: w, height: h, fps: fd ? fn / fd : fn, hasAudio: Boolean(a), size: Number(j.format.size)};
};

/** H.264 proxy: short side ≤ 1080, constant fps, dense keyframes for fast seeking in the Player. */
export const makeProxy = async (input, output, {fps = 30, duration, onProgress} = {}) => {
  const scale = "scale='if(gt(iw,ih),-2,min(1080,iw))':'if(gt(iw,ih),min(1080,ih),-2)'";
  await run('ffmpeg', ['-y', '-hide_banner', '-i', input, '-vf', `fps=${fps},${scale},format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-g', String(fps), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', output], {
    onLine: (l) => {
      const m = /^out_time_us=(\d+)/.exec(l);
      if (m && duration && onProgress) onProgress(Math.min(1, Number(m[1]) / 1e6 / duration));
    },
  });
};

export const extractWav = (input, output) => run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', input, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', output]);

/** Word-level transcript: [{t, start, end}] in seconds. */
export const transcribe = async (wav, language = 'pt', onProgress) => {
  const out = await whisper({
    model: WHISPER_MODEL, whisperPath: WHISPER_PATH, whisperCppVersion: '1.7.4', inputPath: wav,
    tokenLevelTimestamps: true, splitOnWord: true, printOutput: false, language,
    onProgress: onProgress ? (p) => onProgress(p) : undefined,
  });
  const {captions} = toCaptions({whisperCppOutput: out});
  return captions
    .map((c) => ({t: c.text.trim(), start: c.startMs / 1000, end: c.endMs / 1000}))
    .filter((w) => w.t && !/^\[.*\]$/.test(w.t));
};

/** Silence intervals [[start, end], ...] */
export const silences = async (input, {noise = -35, minDur = 0.3} = {}) => {
  const {err} = await run('ffmpeg', ['-hide_banner', '-i', input, '-vn', '-af', `silencedetect=noise=${noise}dB:d=${minDur}`, '-f', 'null', '-']);
  const res = [];
  let s = null;
  for (const m of err.matchAll(/silence_(start|end): (-?[0-9.]+)/g)) {
    if (m[1] === 'start') s = Math.max(0, Number(m[2]));
    else if (s !== null) { res.push([s, Number(m[2])]); s = null; }
  }
  if (s !== null) res.push([s, Infinity]);
  return res;
};

/** Scene-cut timestamps (s). */
export const sceneCuts = async (input, threshold = 0.28) => {
  const {err} = await run('ffmpeg', ['-hide_banner', '-i', input, '-an', '-vf', `scale=320:-2,select='gt(scene,${threshold})',showinfo`, '-f', 'null', '-']);
  return [...err.matchAll(/pts_time:([0-9.]+)/g)].map((m) => Number(m[1]));
};

export const loudness = async (input) => {
  const {err} = await run('ffmpeg', ['-hide_banner', '-i', input, '-vn', '-af', 'ebur128', '-f', 'null', '-'], {allowFail: true});
  const m = /I:\s+(-?[0-9.]+) LUFS/.exec(err.split('Summary:').pop() ?? '');
  return m ? Number(m[1]) : null;
};

/** One JPEG at time t (s), `width` px wide. */
export const still = (input, t, output, width = 720) =>
  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', input, '-frames:v', '1', '-vf', `scale=${width}:-2`, '-q:v', '3', output]);

/**
 * Contact sheet: `count` frames starting at `start`, one every `step` seconds, tiled cols×rows.
 * Returns the timestamps (reading order) so they can be described to the model.
 */
export const contactSheet = async (input, {start, step, cols, rows, width = 360, output}) => {
  const count = cols * rows;
  await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(start), '-i', input, '-vf', `fps=${(1 / step).toFixed(4)},scale=${width}:-2,tile=${cols}x${rows}:padding=4:color=white`, '-frames:v', '1', '-q:v', '3', output]);
  return Array.from({length: count}, (_, i) => +(start + i * step).toFixed(2));
};

/** Identity of a source file: re-uploads reuse the same path, so size + mtime decide if caches are stale. */
export const fingerprint = (p) => {
  const st = fs.statSync(p);
  return `${p}|${st.size}|${Math.round(st.mtimeMs)}`;
};

export const fileExists = (p) => {
  try { return fs.statSync(p).size > 0; } catch { return false; }
};
