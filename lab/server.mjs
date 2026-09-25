// Lab de Edição — local server: REST API + media streaming + Vite-powered UI.
// Run with `npm run lab` and open http://localhost:4747
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {analyzeReference} from './lib/analyze.mjs';
import {buildSpec, listRenders, loadProject, planWithAi, prepareRaw, projectFiles, refineWithAi, renderProject} from './lib/edit.mjs';
import {jobCtx} from './lib/jobctx.mjs';
import {clearMotion, generateMotion, removeMotion, writeRegistry} from './lib/motion.mjs';
import {sanitizePlan, sanitizeStyle} from './lib/sanitize.mjs';
import {DEFAULT_STYLE} from './lib/schemas.mjs';
import {DATA, dirOf, getMeta, list, mediaUrl, newId, readJson, ROOT, saveMeta, writeJson} from './lib/store.mjs';

const PORT = Number(process.env.LAB_PORT ?? 4747);
const PUBLIC = path.join(ROOT, 'public');

// ---------- jobs ----------
const jobs = new Map();
const controls = new Map(); // job id -> {cancelled, children}
const startJob = (kind, target, fn) => {
  for (const j of jobs.values()) if (j.target === target && j.status === 'running') throw Object.assign(new Error('Já existe uma tarefa rodando para este item'), {status: 409});
  const job = {id: newId(kind), kind, target, status: 'running', step: '', log: [], progress: null, costUsd: 0, startedAt: Date.now(), result: null, error: null};
  jobs.set(job.id, job);
  const [entity, id] = target.split(':');
  const push = (m) => { job.log.push(m); if (job.log.length > 400) job.log.shift(); };
  const api = {
    step: (s) => { job.step = s; job.progress = null; push(`▸ ${s}`); },
    log: (m) => push(String(m)),
    progress: (p) => { job.progress = p; },
    cost: (c, model) => {
      job.costUsd += c;
      push(`IA (${model}): US$ ${c.toFixed(3)}`);
      saveMeta(entity, id, {costUsd: (getMeta(entity, id)?.costUsd ?? 0) + c});
    },
  };
  saveMeta(entity, id, {job: job.id});
  const ctl = {cancelled: false, children: new Set()};
  controls.set(job.id, ctl);
  const guarded = async () => {
    const r = await fn(api);
    if (ctl.cancelled) throw new Error('Cancelado');
    return r;
  };
  jobCtx.run(ctl, guarded).then(
    (r) => { job.status = 'done'; job.result = r ?? null; job.progress = 1; push('✓ Concluído'); },
    (e) => {
      job.status = 'error';
      job.error = ctl.cancelled ? 'Cancelado por você' : e.message;
      push(`✗ ${job.error}`);
      if (!ctl.cancelled) console.error(e);
    },
  ).finally(() => { job.endedAt = Date.now(); controls.delete(job.id); });
  return job;
};

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

let studio = null;

// ---------- routes ----------
const routes = [
  ['GET', /^\/api\/state$/, () => ({styles: list('style'), projects: list('project'), music: musicLibrary(), running: [...jobs.values()].filter((j) => j.status === 'running').map((j) => ({id: j.id, target: j.target, step: j.step}))})],
  ['GET', /^\/api\/jobs\/([\w-]+)$/, (m) => jobs.get(m[1]) ?? Promise.reject(Object.assign(new Error('tarefa não encontrada'), {status: 404}))],
  ['POST', /^\/api\/jobs\/([\w-]+)\/cancel$/, (m) => {
    const ctl = controls.get(m[1]);
    if (!ctl) return {ok: false};
    ctl.cancelled = true;
    for (const c of ctl.children) c.kill('SIGTERM');
    return {ok: true};
  }],
  ['GET', /^\/api\/current-spec$/, () => readJson(path.join(DATA, 'current-spec.json'))],

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
          await generateMotion(id, {model, prompt: meta.motionPrompt, feedback, file: 'sample.tsx', fromSec: startSec, toSec: startSec + lenSec}, job);
        }
        const frames = [Math.round(startSec * spec.fps), Math.min(spec.durationInFrames, Math.round((startSec + lenSec) * spec.fps)) - 1];
        const url = await renderProject(id, {port: PORT, frames, label: 'amostra-'}, job);
        saveMeta('project', id, {stage: 'sample-ready', sample: {startSec, lenSec, from: frames[0], to: frames[1], url}});
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
          const CHUNK = 45;
          const ranges = [[0, startSec], [startSec + lenSec, total]].filter(([a, b]) => b - a > 1);
          const chunks = ranges.flatMap(([a, b]) => Array.from({length: Math.ceil((b - a) / CHUNK)}, (_, i) => [a + i * CHUNK, Math.min(b, a + (i + 1) * CHUNK)]));
          for (const [i, [a, b]] of chunks.entries()) {
            job.log(`Trecho ${i + 1}/${chunks.length}: ${a.toFixed(0)}s–${b.toFixed(0)}s`);
            try {
              await generateMotion(id, {model, prompt: meta.motionPrompt, file: `part-${i + 1}.tsx`, fromSec: a, toSec: b}, job);
            } catch (e) {
              job.log(`⚠ Trecho ${i + 1} ficou sem motion: ${e.message}`);
            }
          }
        }
        const url = await renderProject(id, {port: PORT, label: 'completo-'}, job);
        saveMeta('project', id, {stage: 'done', finalUrl: url});
      } catch (e) {
        saveMeta('project', id, {stage: 'sample-ready'});
        throw e;
      }
    });
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
  ['POST', /^\/api\/projects\/([\w-]+)\/open-studio$/, (m) => {
    const spec = readJson(projectFiles(m[1]).spec);
    if (spec) writeJson(path.join(DATA, 'current-spec.json'), spec);
    if (!studio || studio.exitCode !== null) {
      studio = spawn('npx', ['remotion', 'studio', '--port=3000', '--no-open'], {cwd: ROOT, stdio: 'ignore'});
    }
    return {url: 'http://localhost:3000/LabEdit'};
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
const stop = () => { studio?.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
