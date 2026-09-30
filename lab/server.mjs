// Lab de Edição — local server: REST API + media streaming + Vite-powered UI.
// Run with `npm run lab` and open http://localhost:4747
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {analyzeReference} from './lib/analyze.mjs';
import {buildSpec, listRenders, loadProject, overviewWithAi, planWithAi, prepareRaw, projectFiles, refineWithAi, renderProject, resetTranscript} from './lib/edit.mjs';
import {jobCtx, pool} from './lib/jobctx.mjs';
import {fingerprint, probe} from './lib/media.mjs';
import {clearMotion, generateMotion, removeMotion, rosterWithAi, writeRegistry} from './lib/motion.mjs';
import {getBrief, parentPrompt, saveBrief} from './lib/prompts.mjs';
import {sanitizePlan, sanitizeStyle} from './lib/sanitize.mjs';
import {DEFAULT_STYLE, SFX} from './lib/schemas.mjs';
import {DATA, dirOf, getMeta, list, mediaUrl, newId, readJson, ROOT, saveMeta, writeJson} from './lib/store.mjs';
import {readTranscript, TRANSCRIPT_EXTS} from './lib/transcript.mjs';

const PORT = Number(process.env.LAB_PORT ?? 4747);
const PUBLIC = path.join(ROOT, 'public');
/** Motion blocks of the full video written at the same time (each still waits for a free AI slot). */
const MOTION_PARALLEL = Number(process.env.LAB_MOTION_PARALLEL ?? 3);
const CHUNK_SEC = 45;

// ---------- jobs ----------
const jobs = new Map();
const controls = new Map(); // job id -> {cancelled, children}
const startJob = (kind, target, fn) => {
  for (const j of jobs.values()) if (j.target === target && j.status === 'running') throw Object.assign(new Error('Já existe uma tarefa rodando para este item'), {status: 409});
  const job = {id: newId(kind), kind, target, status: 'running', step: '', steps: [], log: [], progress: null, waiting: null, costUsd: 0, startedAt: Date.now(), result: null, error: null};
  jobs.set(job.id, job);
  const [entity, id] = target.split(':');
  const push = (m) => { job.log.push(m); if (job.log.length > 400) job.log.shift(); };
  // Each step keeps its own timing and progress so the UI can show one bar per stage.
  // `cur` is the sequential step; tasks (parallel motion blocks) run beside it and close themselves.
  let cur = null;
  const closeStep = (status) => {
    if (cur?.status === 'running') Object.assign(cur, {status, endedAt: Date.now(), progress: status === 'done' ? 1 : cur.progress, waiting: null});
  };
  const cost = (c, model) => {
    job.costUsd += c;
    push(`IA (${model}): US$ ${c.toFixed(3)}`);
    saveMeta(entity, id, {costUsd: (getMeta(entity, id)?.costUsd ?? 0) + c});
  };
  const api = {
    step: (s) => {
      closeStep('done');
      cur = {label: s, status: 'running', progress: null, startedAt: Date.now()};
      job.steps.push(cur);
      job.step = s; job.progress = null; push(`▸ ${s}`);
    },
    log: (m) => push(String(m)),
    progress: (p) => { job.progress = p; if (cur?.status === 'running') cur.progress = p; },
    cost,
    waiting: (_kind, label) => { job.waiting = label; if (cur?.status === 'running') cur.waiting = label; },
    /** A step that runs in parallel with others; returns a job-like api scoped to it. */
    task: (title) => {
      closeStep('done');
      const t = {label: title, status: 'running', progress: null, startedAt: Date.now(), parallel: true};
      job.steps.push(t);
      push(`▸ ${title}`);
      return {
        step: (s) => { t.label = `${title} · ${s}`; t.progress = null; },
        log: (m) => push(`[${title.split(' ·')[0]}] ${m}`),
        progress: (p) => { t.progress = p; },
        cost,
        waiting: (_kind, label) => { t.waiting = label; },
        end: (status, label) => Object.assign(t, {status, endedAt: Date.now(), progress: status === 'done' ? 1 : t.progress, waiting: null, ...(label && {label: `${title} · ${label}`})}),
      };
    },
  };
  saveMeta(entity, id, {job: job.id});
  const ctl = {cancelled: false, children: new Set(), onCancel: new Set(), job: api};
  controls.set(job.id, ctl);
  const guarded = async () => {
    const r = await fn(api);
    if (ctl.cancelled) throw new Error('Cancelado');
    return r;
  };
  jobCtx.run(ctl, guarded).then(
    (r) => { closeStep('done'); job.status = 'done'; job.waiting = null; job.result = r ?? null; job.progress = 1; push('✓ Concluído'); },
    (e) => {
      closeStep('error');
      job.status = 'error';
      job.waiting = null;
      job.error = ctl.cancelled ? 'Cancelado por você' : e.message;
      push(`✗ ${job.error}`);
      if (!ctl.cancelled) console.error(e);
    },
  ).finally(() => { job.endedAt = Date.now(); controls.delete(job.id); });
  return job;
};

/** Compact view of a running job for the sidebar's task list. */
const runningInfo = (j) => {
  const [entity, id] = j.target.split(':');
  const par = j.steps.filter((x) => x.parallel);
  const active = par.filter((x) => x.status === 'running');
  return {
    id: j.id, target: j.target, kind: j.kind, name: getMeta(entity, id)?.name ?? id, startedAt: j.startedAt,
    step: active.length ? `${active.length} bloco(s) de motion em paralelo` : j.step,
    waiting: j.waiting ?? (active.length && active.every((x) => x.waiting) ? active[0].waiting : null),
    progress: par.length ? par.filter((x) => x.status !== 'running').length / par.length : j.progress,
  };
};

/** Edit-time windows (s) of the full video's motion blocks: everything outside the sample, in ~45 s pieces. */
const motionChunks = (total, {startSec, lenSec}) => [[0, startSec], [startSec + lenSec, total]]
  .filter(([a, b]) => b - a > 1)
  .flatMap(([a, b]) => Array.from({length: Math.ceil((b - a) / CHUNK_SEC)}, (_, i) => [a + i * CHUNK_SEC, Math.min(b, a + (i + 1) * CHUNK_SEC)]));

// ---------- helpers ----------
// Security: the server listens on 127.0.0.1 only. Cross-origin reads are allowed only for other
// localhost pages (Remotion Studio and the headless render page need the media and the current spec);
// anything that changes state must come from the Lab UI itself (same origin) or a non-browser client.
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const SELF_ORIGINS = new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]);
const corsHeaders = (req) => (LOCAL_ORIGIN.test(req.headers.origin ?? '') ? {'Access-Control-Allow-Origin': req.headers.origin, Vary: 'Origin'} : {});
const checkRequest = (req) => {
  const host = String(req.headers.host ?? '');
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) throw Object.assign(new Error('host não permitido'), {status: 403});
  const origin = req.headers.origin;
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS' && origin && !SELF_ORIGINS.has(origin)) {
    throw Object.assign(new Error('origem não permitida'), {status: 403});
  }
};

const send = (res, code, body, req) => {
  res.writeHead(code, {'Content-Type': 'application/json; charset=utf-8', ...(req ? corsHeaders(req) : {})});
  res.end(JSON.stringify(body));
};
const readBody = async (req) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString('utf8');
  return s ? JSON.parse(s) : {};
};
const receiveFile = (req, dest) => new Promise((resolve, reject) => {
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  const ws = fs.createWriteStream(dest);
  req.pipe(ws);
  ws.on('finish', resolve);
  ws.on('error', reject);
  req.on('error', reject);
});
const extOf = (req) => (path.extname(decodeURIComponent(String(req.headers['x-filename'] ?? ''))).toLowerCase() || '.mp4').replace(/[^.a-z0-9]/g, '');

const MIME = {'.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json'};
const serveFile = (req, res, file) => {
  let st;
  try { st = fs.statSync(file); } catch { res.writeHead(404); return res.end(); }
  if (!st.isFile()) { res.writeHead(404); return res.end(); }
  const headers = {'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Accept-Ranges': 'bytes', ...corsHeaders(req), 'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges', 'Cache-Control': 'no-cache'};
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
    if (start >= st.size) { res.writeHead(416, {'Content-Range': `bytes */${st.size}`}); return res.end(); }
    res.writeHead(206, {...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1});
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, {start, end}).pipe(res);
  }
  res.writeHead(200, {...headers, 'Content-Length': st.size});
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
};
const safeJoin = (base, rel) => {
  const p = path.resolve(base, decodeURIComponent(rel));
  if (!p.startsWith(base + path.sep)) throw Object.assign(new Error('caminho inválido'), {status: 400});
  return p;
};
const musicLibrary = () => {
  const dir = path.join(PUBLIC, 'music');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => /\.(wav|mp3|m4a)$/i.test(n)).map((n) => ({name: n, url: `/static/music/${n}`}));
};
const setLocalSource = (kind, id, p) => {
  const abs = path.resolve(String(p ?? '').trim().replace(/^['"]|['"]$/g, '').replace(/^~(?=\/)/, process.env.HOME));
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw Object.assign(new Error(`Arquivo não encontrado: ${abs}`), {status: 400});
  return saveMeta(kind, id, {source: abs, sourceName: path.basename(abs)});
};

const styleDetail = (id) => ({meta: getMeta('style', id), style: readJson(path.join(dirOf('style', id), 'style.json'))});
const projectDetail = (id) => {
  const p = loadProject(id);
  return {meta: p.meta, style: p.style, plan: p.plan, spec: p.spec, renders: listRenders(id), words: p.words?.length ?? 0};
};
const copyStyleToProject = (projectId, styleId) => {
  const src = styleId ? readJson(path.join(dirOf('style', styleId), 'style.json')) : null;
  writeJson(projectFiles(projectId).style, sanitizeStyle(src ?? DEFAULT_STYLE));
  saveMeta('project', projectId, {styleId: styleId ?? null, styleName: styleId ? getMeta('style', styleId)?.name : DEFAULT_STYLE.name});
};
const rebuildIfPossible = (id) => (readJson(projectFiles(id).info) ? buildSpec(id) : null);
const assertIdle = (target) => {
  if ([...jobs.values()].some((j) => j.target === target && j.status === 'running')) throw Object.assign(new Error('Espere a tarefa atual terminar'), {status: 409});
};

// ---------- transcript ----------
/** Stores transcript<ext> in the project, validates it and invalidates everything indexed by word. */
const setTranscript = (id, file, name) => {
  let parsed;
  try { parsed = readTranscript(file); } catch (e) { fs.rmSync(file, {force: true}); throw e; }
  const dir = dirOf('project', id);
  for (const n of fs.readdirSync(dir)) if (/^transcript\./.test(n) && path.join(dir, n) !== file) fs.rmSync(path.join(dir, n), {force: true});
  saveMeta('project', id, {transcript: {file, name, kind: parsed.kind, timed: parsed.timed, words: parsed.timed ? parsed.words.length : parsed.text.length, fp: fingerprint(file)}});
  resetTranscript(id);
  return projectDetail(id);
};
const transcriptExt = (text) => {
  const s = text.trimStart();
  if (/^WEBVTT/.test(s)) return '.vtt';
  if (/-->/.test(s)) return '.srt';
  if (/^[[{]/.test(s)) return '.json';
  return '.txt';
};

// ---------- effects library ----------
/** Duration and a coarse waveform (48 peaks) of a 16-bit PCM WAV, cached by mtime. */
const wavCache = new Map();
const wavInfo = (file) => {
  const st = fs.statSync(file);
  const hit = wavCache.get(file);
  if (hit?.mtime === st.mtimeMs) return hit.info;
  const b = fs.readFileSync(file);
  let o = 12, ch = 2, sr = 48000, bits = 16, data = null;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(o + 10); sr = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22); }
    if (id === 'data') { data = [o + 8, Math.min(size, b.length - o - 8)]; break; }
    o += 8 + size + (size & 1);
  }
  let info = {sec: 0, peaks: []};
  if (data && bits === 16) {
    const frames = Math.floor(data[1] / (2 * ch));
    const N = 48, per = Math.max(1, Math.floor(frames / N));
    const peaks = [];
    for (let k = 0; k < N; k++) {
      let mx = 0;
      for (let i = k * per; i < Math.min(frames, (k + 1) * per); i += 4) mx = Math.max(mx, Math.abs(b.readInt16LE(data[0] + i * 2 * ch)) / 32768);
      peaks.push(+mx.toFixed(3));
    }
    info = {sec: +(frames / sr).toFixed(2), peaks};
  }
  wavCache.set(file, {mtime: st.mtimeMs, info});
  return info;
};
/** Footage for the visual-effect demos: the latest project's proxy, else any video in public/video. */
const demoFootage = async () => {
  for (const p of list('project')) {
    const f = projectFiles(p.id);
    const info = readJson(f.info);
    if (info && fs.existsSync(f.raw)) return {url: mediaUrl(f.raw), width: info.width, height: info.height, duration: info.duration, name: p.name};
  }
  const dir = path.join(PUBLIC, 'video');
  const n = fs.existsSync(dir) ? fs.readdirSync(dir).find((x) => /\.(mp4|mov|webm)$/i.test(x)) : null;
  if (!n) return null;
  const info = await probe(path.join(dir, n));
  return {url: `/static/video/${n}`, width: info.width, height: info.height, duration: info.duration, name: n};
};

// ---------- Remotion Studio ("Abrir no editor") ----------
let studio = null; // {proc, ready: Promise<string base url>}
const startStudio = () => {
  if (studio) return studio.ready;
  const proc = spawn('npx', ['remotion', 'studio', '--port=3000', '--no-open'], {cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe']});
  let out = '';
  const ready = new Promise((resolve, reject) => {
    // Keep reading after it is ready: an undrained pipe would block the Studio.
    const onData = (b) => {
      out = (out + b).slice(-6000);
      const m = /Local:\s*(http:\/\/localhost:\d+)/.exec(out);
      if (m) resolve(m[1]);
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', reject);
    proc.on('exit', (code) => reject(new Error(`O Remotion Studio fechou (código ${code}): ${out.slice(-400)}`)));
    setTimeout(() => reject(new Error('O Remotion Studio demorou mais de 2 minutos para abrir')), 120000);
  });
  studio = {proc, ready};
  const forget = () => { if (studio?.proc === proc) studio = null; };
  proc.on('exit', forget);
  ready.catch(() => { forget(); proc.kill(); });
  return ready;
};

// ---------- routes ----------
const routes = [
  ['GET', /^\/api\/state$/, () => ({styles: list('style'), projects: list('project'), music: musicLibrary(), running: [...jobs.values()].filter((j) => j.status === 'running').map(runningInfo)})],
  ['GET', /^\/api\/jobs\/([\w-]+)$/, (m) => jobs.get(m[1]) ?? Promise.reject(Object.assign(new Error('tarefa não encontrada'), {status: 404}))],
  ['POST', /^\/api\/jobs\/([\w-]+)\/cancel$/, (m) => {
    const ctl = controls.get(m[1]);
    if (!ctl) return {ok: false};
    ctl.cancelled = true;
    for (const c of ctl.children) c.kill('SIGTERM');
    for (const f of [...ctl.onCancel]) f();
    return {ok: true};
  }],
  ['GET', /^\/api\/current-spec$/, () => readJson(path.join(DATA, 'current-spec.json'))],
  ['GET', /^\/api\/library$/, async () => ({
    sfx: Object.fromEntries(SFX.map((n) => {
      const file = path.join(PUBLIC, 'sfx', `${n}.wav`);
      return [n, fs.existsSync(file) ? wavInfo(file) : null];
    })),
    footage: await demoFootage(),
    baseStyle: DEFAULT_STYLE,
  })],

  // styles (reference videos)
  ['POST', /^\/api\/styles$/, async (m, req) => {
    const {name, blank} = await readBody(req);
    const id = newId(name || 'estilo');
    const meta = saveMeta('style', id, {id, name: name || 'Nova referência', nameLocked: Boolean(name), createdAt: Date.now()});
    if (blank) { writeJson(path.join(dirOf('style', id), 'style.json'), {...DEFAULT_STYLE, name: meta.name}); saveMeta('style', id, {analyzed: true}); }
    return getMeta('style', id);
  }],
  ['GET', /^\/api\/styles\/([\w-]+)$/, (m) => styleDetail(m[1])],
  ['PUT', /^\/api\/styles\/([\w-]+)\/source$/, async (m, req) => {
    const dest = path.join(dirOf('style', m[1]), `source${extOf(req)}`);
    await receiveFile(req, dest);
    return saveMeta('style', m[1], {source: dest, sourceName: decodeURIComponent(String(req.headers['x-filename'] ?? 'video'))});
  }],
  ['POST', /^\/api\/styles\/([\w-]+)\/source-path$/, async (m, req) => setLocalSource('style', m[1], (await readBody(req)).path)],
  ['POST', /^\/api\/styles\/([\w-]+)\/analyze$/, async (m, req) => {
    const {model = 'sonnet', language = 'pt'} = await readBody(req);
    return startJob('analyze', `style:${m[1]}`, (job) => analyzeReference(m[1], {model, language}, job));
  }],
  ['PUT', /^\/api\/styles\/([\w-]+)\/style$/, async (m, req) => {
    const {style, name} = await readBody(req);
    if (style) writeJson(path.join(dirOf('style', m[1]), 'style.json'), sanitizeStyle(style));
    if (name) saveMeta('style', m[1], {name, nameLocked: true});
    return styleDetail(m[1]);
  }],
  ['DELETE', /^\/api\/styles\/([\w-]+)$/, (m) => { fs.rmSync(dirOf('style', m[1]), {recursive: true, force: true}); return {ok: true}; }],

  // projects (raw footage → edit)
  ['POST', /^\/api\/projects$/, async (m, req) => {
    const {name, styleId} = await readBody(req);
    const id = newId(name || 'projeto');
    saveMeta('project', id, {id, name: name || 'Novo projeto', createdAt: Date.now(), music: null});
    copyStyleToProject(id, styleId);
    return getMeta('project', id);
  }],
  ['GET', /^\/api\/projects\/([\w-]+)$/, (m) => projectDetail(m[1])],
  ['PUT', /^\/api\/projects\/([\w-]+)\/source$/, async (m, req) => {
    const dest = path.join(dirOf('project', m[1]), `source${extOf(req)}`);
    await receiveFile(req, dest);
    return saveMeta('project', m[1], {source: dest, sourceName: decodeURIComponent(String(req.headers['x-filename'] ?? 'video'))});
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/source-path$/, async (m, req) => setLocalSource('project', m[1], (await readBody(req)).path)],
  ['PUT', /^\/api\/projects\/([\w-]+)\/transcript$/, async (m, req) => {
    assertIdle(`project:${m[1]}`);
    const ext = extOf(req);
    if (!TRANSCRIPT_EXTS.includes(ext)) throw Object.assign(new Error(`Formato não suportado (${ext}). Use ${TRANSCRIPT_EXTS.join(', ')}`), {status: 400});
    const dest = path.join(dirOf('project', m[1]), `transcript${ext}`);
    await receiveFile(req, dest);
    return setTranscript(m[1], dest, decodeURIComponent(String(req.headers['x-filename'] ?? `transcricao${ext}`)));
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/transcript-text$/, async (m, req) => {
    assertIdle(`project:${m[1]}`);
    const text = String((await readBody(req)).text ?? '');
    if (!text.trim()) throw Object.assign(new Error('Cole o texto da transcrição'), {status: 400});
    const ext = transcriptExt(text);
    const dest = path.join(dirOf('project', m[1]), `transcript${ext}`);
    fs.writeFileSync(dest, text);
    return setTranscript(m[1], dest, `texto colado (${ext.slice(1).toUpperCase()})`);
  }],
  ['DELETE', /^\/api\/projects\/([\w-]+)\/transcript$/, (m) => {
    assertIdle(`project:${m[1]}`);
    const tr = getMeta('project', m[1])?.transcript;
    if (tr?.file) fs.rmSync(tr.file, {force: true});
    saveMeta('project', m[1], {transcript: null});
    resetTranscript(m[1]);
    return projectDetail(m[1]);
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/clear-source$/, (m) => { saveMeta('project', m[1], {source: null, sourceName: null}); return projectDetail(m[1]); }],
  ['PUT', /^\/api\/projects\/([\w-]+)\/meta$/, async (m, req) => {
    const b = await readBody(req);
    const patch = {};
    if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim();
    if (typeof b.motionPrompt === 'string') patch.motionPrompt = b.motionPrompt;
    if (typeof b.motionEnabled === 'boolean') patch.motionEnabled = b.motionEnabled;
    if (b.sample) patch.sample = {...getMeta('project', m[1])?.sample, startSec: Number(b.sample.startSec) || 0, lenSec: Number(b.sample.lenSec) || 15};
    saveMeta('project', m[1], patch);
    return projectDetail(m[1]);
  }],

  // Stage 1: 8–20 s sample (cuts + captions + motion), rendered for approval.
  ['POST', /^\/api\/projects\/([\w-]+)\/sample$/, async (m, req) => {
    const {model = 'sonnet', language = 'pt', feedback = '', replan = false, skipAi = false} = await readBody(req);
    const id = m[1];
    return startJob('sample', `project:${id}`, async (job) => {
      saveMeta('project', id, {stage: 'sampling'});
      try {
        await prepareRaw(id, {language}, job);
        if (!skipAi) await overviewWithAi(id, {model}, job);
        if (!skipAi && (replan || !readJson(projectFiles(id).plan))) await planWithAi(id, {model}, job);
        if (!skipAi && feedback.trim()) await refineWithAi(id, {model, instruction: feedback}, job);
        job.step('Montando a timeline');
        const spec = buildSpec(id);
        const meta = getMeta('project', id);
        const total = spec.durationInFrames / spec.fps;
        const lenSec = Math.min(total, Math.max(8, Math.min(20, meta.sample?.lenSec ?? 15)));
        const startSec = Math.max(0, Math.min(total - lenSec, meta.sample?.startSec ?? 0));
        clearMotion(id);
        if (!skipAi && meta.motionEnabled !== false) {
          await generateMotion(id, {model, feedback, file: 'sample.tsx', fromSec: startSec, toSec: startSec + lenSec}, job);
        }
        const frames = [Math.round(startSec * spec.fps), Math.min(spec.durationInFrames, Math.round((startSec + lenSec) * spec.fps)) - 1];
        const url = await renderProject(id, {port: PORT, frames, label: 'amostra-'}, job);
        saveMeta('project', id, {stage: 'sample-ready', sample: {startSec, lenSec, from: frames[0], to: frames[1], url}});
        // Plan the full video now, so the Briefing tab shows (and lets you edit) it before you approve.
        if (!skipAi && meta.motionEnabled !== false) {
          try {
            await rosterWithAi(id, {model, chunks: motionChunks(total, {startSec, lenSec})}, job);
          } catch (e) {
            job.log(`⚠ Roteiro dos blocos fica para a aprovação: ${e.message}`);
          }
        }
      } catch (e) {
        saveMeta('project', id, {stage: 'draft'});
        throw e;
      }
    });
  }],

  // Stage 2: after approval, motion for the rest (in chunks, same visual language) + full render.
  ['POST', /^\/api\/projects\/([\w-]+)\/approve$/, async (m, req) => {
    const {model = 'sonnet'} = await readBody(req);
    const id = m[1];
    const meta = getMeta('project', id);
    if (meta?.stage !== 'sample-ready' && meta?.stage !== 'done') throw Object.assign(new Error('Gere e confira a amostra primeiro'), {status: 400});
    return startJob('full', `project:${id}`, async (job) => {
      saveMeta('project', id, {stage: 'full'});
      try {
        const spec = buildSpec(id);
        const total = spec.durationInFrames / spec.fps;
        const {startSec, lenSec} = getMeta('project', id).sample;
        clearMotion(id, {keepSample: true});
        if (meta.motionEnabled !== false) {
          const chunks = motionChunks(total, {startSec, lenSec});
          // Brief part 2 (skipped if the sample and the blocks did not change since the sample run).
          await rosterWithAi(id, {model, chunks}, job);
          job.log(`${chunks.length} blocos de motion, até ${MOTION_PARALLEL} ao mesmo tempo`);
          const ctl = jobCtx.getStore();
          const results = await pool(chunks, MOTION_PARALLEL, ([a, b], i) => {
            const t = job.task(`Bloco ${i + 1}/${chunks.length} · ${a.toFixed(0)}s–${b.toFixed(0)}s`);
            // Same cancel/children as the job, but queue waits and steps show on this block's row.
            return jobCtx.run(Object.assign(Object.create(ctl), {job: t}), async () => {
              const opts = {model, file: `part-${i + 1}.tsx`, fromSec: a, toSec: b, block: {index: i + 1, total: chunks.length}};
              try {
                const r = await generateMotion(id, opts, t).catch(async (e) => {
                  if (ctl.cancelled) throw e;
                  t.log(`falhou (${e.message.split('\n')[0]}), tentando de novo`);
                  return generateMotion(id, opts, t);
                });
                t.end('done', r ? `${r.scenes.length} cena(s)` : 'sem fala');
              } catch (e) {
                t.end('error', 'sem motion');
                throw e;
              }
            });
          });
          if (ctl.cancelled) throw new Error('Cancelado');
          results.forEach((r, i) => { if (!r.ok) job.log(`⚠ Bloco ${i + 1} ficou sem motion: ${r.error.message}`); });
        }
        const url = await renderProject(id, {port: PORT, label: 'completo-'}, job);
        saveMeta('project', id, {stage: 'done', finalUrl: url});
      } catch (e) {
        saveMeta('project', id, {stage: 'sample-ready'});
        throw e;
      }
    });
  }],
  // Brief = the project's parent prompt. The UI edits its parts; every AI stage reads it.
  ['GET', /^\/api\/projects\/([\w-]+)\/brief$/, (m) => ({brief: getBrief(m[1]), parent: parentPrompt(m[1])})],
  ['PUT', /^\/api\/projects\/([\w-]+)\/brief$/, async (m, req) => {
    assertIdle(`project:${m[1]}`);
    const b = await readBody(req);
    const cur = getBrief(m[1]);
    const patch = {};
    for (const k of ['overview', 'audience', 'tone', 'visual', 'notes']) if (typeof b[k] === 'string') patch[k] = b[k];
    if (Array.isArray(b.sections)) patch.sections = b.sections.filter((x) => Number.isFinite(x?.fromWord) && Number.isFinite(x?.toWord)).map((x) => ({fromWord: x.fromWord, toWord: x.toWord, topic: String(x.topic ?? ''), intent: String(x.intent ?? '')}));
    if (Array.isArray(b.blocks) && cur.blocks) {
      patch.blocks = cur.blocks.map((x) => {
        const e = b.blocks.find((y) => y?.index === x.index) ?? {};
        return {...x, ...Object.fromEntries(['focus', 'avoid', 'bridge'].filter((k) => typeof e[k] === 'string').map((k) => [k, e[k]]))};
      });
    }
    saveBrief(m[1], patch);
    return {brief: getBrief(m[1]), parent: parentPrompt(m[1])};
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/use-style$/, async (m, req) => {
    copyStyleToProject(m[1], (await readBody(req)).styleId ?? null);
    rebuildIfPossible(m[1]);
    return projectDetail(m[1]);
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/generate$/, async (m, req) => {
    const {model = 'sonnet', language = 'pt', skipAi = false} = await readBody(req);
    return startJob('generate', `project:${m[1]}`, async (job) => {
      await prepareRaw(m[1], {language}, job);
      if (!skipAi) await planWithAi(m[1], {model}, job);
      job.step('Montando a timeline');
      const spec = buildSpec(m[1]);
      job.log(`${spec.clips.length} cortes · ${(spec.durationInFrames / spec.fps).toFixed(1)} s`);
    });
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/refine$/, async (m, req) => {
    const {model = 'sonnet', instruction} = await readBody(req);
    if (!instruction?.trim()) throw Object.assign(new Error('Escreva o ajuste desejado'), {status: 400});
    return startJob('refine', `project:${m[1]}`, async (job) => {
      await refineWithAi(m[1], {model, instruction}, job);
      job.step('Montando a timeline');
      buildSpec(m[1]);
    });
  }],
  ['PUT', /^\/api\/projects\/([\w-]+)\/style$/, async (m, req) => {
    writeJson(projectFiles(m[1]).style, sanitizeStyle((await readBody(req)).style));
    rebuildIfPossible(m[1]);
    return projectDetail(m[1]);
  }],
  ['PUT', /^\/api\/projects\/([\w-]+)\/plan$/, async (m, req) => {
    const words = readJson(projectFiles(m[1]).words) ?? [];
    writeJson(projectFiles(m[1]).plan, sanitizePlan((await readBody(req)).plan, words.length));
    rebuildIfPossible(m[1]);
    return projectDetail(m[1]);
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/save-style$/, async (m, req) => {
    const {name} = await readBody(req);
    const style = readJson(projectFiles(m[1]).style);
    const id = newId(name || style.name);
    saveMeta('style', id, {id, name: name || `${style.name} (ajustado)`, nameLocked: true, analyzed: true, createdAt: Date.now()});
    writeJson(path.join(dirOf('style', id), 'style.json'), {...style, name: name || style.name});
    return getMeta('style', id);
  }],
  ['PUT', /^\/api\/projects\/([\w-]+)\/music$/, async (m, req) => {
    const dest = path.join(dirOf('project', m[1]), `music${extOf(req)}`);
    await receiveFile(req, dest);
    saveMeta('project', m[1], {music: mediaUrl(dest)});
    rebuildIfPossible(m[1]);
    return projectDetail(m[1]);
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/music-select$/, async (m, req) => {
    saveMeta('project', m[1], {music: (await readBody(req)).url ?? null});
    rebuildIfPossible(m[1]);
    return projectDetail(m[1]);
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/render$/, async (m, req) => {
    const {sampleOnly = false} = await readBody(req);
    const id = m[1];
    const sample = getMeta('project', id)?.sample;
    if (!sampleOnly) return startJob('render', `project:${id}`, (job) => renderProject(id, {port: PORT}, job));
    if (sample?.to === undefined) throw Object.assign(new Error('Ainda não há amostra'), {status: 400});
    // Re-renders the approved window with the current style/plan/motion — no AI calls.
    return startJob('render', `project:${id}`, async (job) => {
      const url = await renderProject(id, {port: PORT, frames: [sample.from, sample.to], label: 'amostra-'}, job);
      saveMeta('project', id, {sample: {...sample, url}});
    });
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/open-studio$/, async (m) => {
    const spec = readJson(projectFiles(m[1]).spec);
    if (!spec) throw Object.assign(new Error('Gere a edição antes de abrir no editor'), {status: 400});
    // The Studio's LabEdit composition loads /api/current-spec, so point it at this project.
    writeJson(path.join(DATA, 'current-spec.json'), spec);
    return {url: `${await startStudio()}/LabEdit`};
  }],
  ['POST', /^\/api\/projects\/([\w-]+)\/reveal$/, (m) => { spawn('open', [path.join(dirOf('project', m[1]), 'renders')]); return {ok: true}; }],
  ['DELETE', /^\/api\/projects\/([\w-]+)$/, (m) => { fs.rmSync(dirOf('project', m[1]), {recursive: true, force: true}); removeMotion(m[1]); return {ok: true}; }],
];

// ---------- server ----------
writeRegistry();
const {createServer: createVite} = await import('vite');
const vite = await createVite({configFile: path.join(ROOT, 'lab', 'vite.config.mjs'), server: {middlewareMode: true}, appType: 'spa'});

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    checkRequest(req);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {...corsHeaders(req), 'Access-Control-Allow-Methods': 'GET,HEAD', 'Access-Control-Allow-Headers': 'Range'});
      return res.end();
    }
    if (u.pathname.startsWith('/media/')) return serveFile(req, res, safeJoin(DATA, u.pathname.slice(7)));
    if (u.pathname.startsWith('/static/')) return serveFile(req, res, safeJoin(PUBLIC, u.pathname.slice(8)));
    if (u.pathname.startsWith('/api/')) {
      const r = routes.find(([method, re]) => method === req.method && re.test(u.pathname));
      if (!r) return send(res, 404, {error: 'rota não encontrada'}, req);
      return send(res, 200, await r[2](r[1].exec(u.pathname), req), req);
    }
    vite.middlewares(req, res);
  } catch (e) {
    if (!e.status || e.status >= 500) console.error(e);
    if (!res.headersSent) send(res, e.status ?? 500, {error: e.message}, req);
  }
});
server.requestTimeout = 0;
server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  🎬 Lab de Edição rodando em ${url}\n`);
  if (!process.env.LAB_NO_OPEN) spawn('open', [url], {stdio: 'ignore'}).on('error', () => {});
});
const stop = () => { studio?.proc.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
