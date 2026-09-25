import fs from 'node:fs';
import path from 'node:path';
import {askClaude} from './ai.mjs';
import {extractWav, fileExists, makeProxy, probe, run, silences, still, transcribe} from './media.mjs';
import {sanitizePlan, sanitizeStyle} from './sanitize.mjs';
import {ASPECTS, PLAN_SCHEMA, REFINE_SCHEMA} from './schemas.mjs';
import {DATA, dirOf, getMeta, mediaUrl, readJson, ROOT, saveMeta, writeJson} from './store.mjs';

const files = (id) => {
  const dir = dirOf('project', id);
  return {
    dir, raw: path.join(dir, 'raw.mp4'), words: path.join(dir, 'words.json'), silences: path.join(dir, 'silences.json'),
    info: path.join(dir, 'info.json'), still: path.join(dir, 'still.jpg'), style: path.join(dir, 'style.json'),
    plan: path.join(dir, 'plan.json'), spec: path.join(dir, 'spec.json'), renders: path.join(dir, 'renders'),
  };
};

export const loadProject = (id) => {
  const f = files(id);
  return {meta: getMeta('project', id), style: readJson(f.style), plan: readJson(f.plan), spec: readJson(f.spec), words: readJson(f.words), info: readJson(f.info)};
};

/** Proxy + transcript + silence map for the raw footage (cached). */
export const prepareRaw = async (id, {language}, job) => {
  const f = files(id);
  const meta = getMeta('project', id);
  if (!meta?.source) throw new Error('Envie o vídeo bruto primeiro');
  job.step('Lendo o bruto');
  const info = await probe(meta.source);
  job.log(`${info.width}×${info.height} · ${info.duration.toFixed(1)} s`);
  if (!fileExists(f.raw) || meta.proxyOf !== meta.source) {
    job.step('Gerando proxy do bruto');
    await makeProxy(meta.source, f.raw, {fps: 30, duration: info.duration, onProgress: (p) => job.progress(p)});
    for (const k of ['words', 'silences']) fs.rmSync(f[k], {force: true});
    saveMeta('project', id, {proxyOf: meta.source, video: mediaUrl(f.raw)});
  }
  const pInfo = await probe(f.raw);
  writeJson(f.info, pInfo);
  if (!fileExists(f.words) || meta.language !== language) {
    job.step('Transcrevendo (Whisper)');
    const wav = path.join(f.dir, 'audio16k.wav');
    await extractWav(f.raw, wav);
    writeJson(f.words, await transcribe(wav, language, (p) => job.progress(p)));
    fs.rmSync(wav, {force: true});
    saveMeta('project', id, {language});
  }
  if (!fileExists(f.silences)) {
    job.step('Mapeando pausas');
    writeJson(f.silences, await silences(f.raw, {noise: -35, minDur: 0.1}));
  }
  if (!fileExists(f.still)) await still(f.raw, pInfo.duration * 0.3, f.still, 640);
  const words = readJson(f.words);
  job.log(`${words.length} palavras transcritas`);
  return {info: pInfo, words};
};

// ---------- deterministic spec builder ----------

const subtract = (spans, [a, b]) => spans.flatMap(([x, y]) => (b <= x || a >= y ? [[x, y]] : [...(a > x ? [[x, a]] : []), ...(b < y ? [[b, y]] : [])]));

export const buildSpec = (id) => {
  const f = files(id);
  const meta = getMeta('project', id);
  const style = sanitizeStyle(readJson(f.style));
  const words = readJson(f.words) ?? [];
  const info = readJson(f.info);
  const plan = sanitizePlan(readJson(f.plan), words.length);
  const quiet = readJson(f.silences) ?? [];
  if (!info) throw new Error('Bruto ainda não preparado');
  const fps = style.format.fps;
  const [W, H] = ASPECTS[style.format.aspect];
  const {padBeforeSec: pb, padAfterSec: pa, maxPauseSec} = style.pacing;
  const D = info.duration;

  // 1) spans of source to keep
  let keep = [[words.length ? Math.max(0, words[0].start - pb) : 0, words.length ? Math.min(D, words.at(-1).end + pa + 0.2) : D]];
  if (style.pacing.removeSilences) {
    for (const [s, e0] of quiet) {
      const e = Math.min(e0, D);
      if (e - s >= maxPauseSec && e - pb > s + pa + 0.04) keep = subtract(keep, [s + pa, e - pb]);
    }
  }
  const dropped = new Set();
  for (const d of plan.dropWords) {
    for (let i = d.from; i <= d.to; i++) dropped.add(i);
    const a = words[d.from].start - 0.04;
    const b = d.to + 1 < words.length ? Math.max(words[d.to].end + 0.02, words[d.to + 1].start - pb) : D;
    keep = subtract(keep, [a, b]);
  }
  keep = keep.filter(([a, b]) => b - a >= 0.2);

  // 2) clips on the output timeline
  const clips = [];
  let out = 0;
  for (const [a, b] of keep) {
    const trimBefore = Math.round(a * fps), dur = Math.round((b - a) * fps);
    if (dur < 4) continue;
    clips.push({from: out, dur, trimBefore});
    out += dur;
  }
  const mapT = (t) => {
    const fr = t * fps;
    for (const c of clips) if (fr >= c.trimBefore - 0.5 && fr <= c.trimBefore + c.dur + 0.5) return Math.round(c.from + (fr - c.trimBefore));
    return null;
  };

  // 3) words on output timeline, remembering raw index
  const hl = new Set(plan.emphasis.filter((e) => e.kind !== 'punch').map((e) => e.w));
  const outWords = [];
  const rawToOut = new Map();
  words.forEach((w, i) => {
    if (dropped.has(i)) return;
    const fa = mapT(w.start) ?? mapT(w.start + 0.08);
    if (fa === null) return;
    const fe = mapT(w.end) ?? fa + Math.max(3, Math.round((w.end - w.start) * fps));
    rawToOut.set(i, outWords.length);
    outWords.push({t: w.t, f: fa, e: Math.max(fa + 2, fe), ri: i, ...(hl.has(i) && {hl: true})});
  });
  const at = (rawIdx) => { const o = rawToOut.get(rawIdx); return o === undefined ? null : outWords[o].f; };

  // 4) captions
  const cs = style.captions;
  const per = cs.mode === 'word-by-word' ? 1 : Math.max(1, Math.round(cs.wordsPerCaption));
  const captions = [];
  let g = [];
  const flush = () => { if (g.length) captions.push({a: outWords[g[0]].f, b: outWords[g.at(-1)].e + 4, w0: g[0], w1: g.at(-1)}); g = []; };
  outWords.forEach((w, i) => {
    const prev = outWords[i - 1];
    if (g.length && (g.length >= per || w.f - prev.e > fps * 0.5 || /[.?!]$/.test(prev.t))) flush();
    g.push(i);
    if (per > 1 && /[,;:]$/.test(w.t) && g.length >= Math.ceil(per / 2)) flush();
  });
  flush();
  for (let i = 0; i < captions.length - 1; i++) captions[i].b = Math.min(captions[i].b, captions[i + 1].a);

  // 5) punches, transitions, callouts, sfx
  const hold = Math.round(style.camera.punchHoldSec * fps);
  const punches = plan.emphasis.filter((e) => e.kind !== 'highlight').map((e) => at(e.w)).filter((x) => x !== null).sort((a, b) => a - b)
    .reduce((acc, fr) => (acc.length && fr - acc.at(-1).f < hold ? acc : [...acc, {f: fr, dur: hold}]), []);
  const tr = style.transitions;
  const transitions = tr.type === 'none' || tr.every <= 0 ? [] : clips.slice(1).filter((_, i) => (i + 1) % Math.round(tr.every) === 0).map((c) => ({f: c.from}));
  const callouts = style.callouts.enabled ? plan.callouts.map((c) => ({f: at(c.w), dur: Math.round(c.durationSec * fps), text: c.text})).filter((c) => c.f !== null) : [];
  const sv = style.audio.sfx;
  const sfx = [];
  const addSfx = (fr, name, offset = 0) => { if (name && fr !== null && !sfx.some((s) => Math.abs(s.f - fr) < 4)) sfx.push({f: Math.max(0, fr + offset), name, volume: sv.volume}); };
  for (const c of callouts) addSfx(c.f, sv.onCallout);
  for (const p of punches) addSfx(p.f, sv.onPunch);
  for (const t of transitions) addSfx(t.f, sv.onCut, -3);
  for (const s of plan.sfx) addSfx(at(s.w), s.name);
  sfx.sort((a, b) => a.f - b.f);

  const spec = {
    version: 1, projectId: id, fps, width: W, height: H, durationInFrames: Math.max(1, out),
    src: {url: mediaUrl(f.raw), width: info.width, height: info.height},
    subject: plan.subject, clips, words: outWords, captions, punches, callouts, transitions, sfx,
    music: style.audio.music.enabled && meta.music ? {url: meta.music, volume: style.audio.music.volume} : null,
    style,
  };
  writeJson(f.spec, spec);
  writeJson(path.join(DATA, 'current-spec.json'), spec);
  saveMeta('project', id, {built: true, durationSec: +(out / fps).toFixed(1), clips: clips.length});
  return spec;
};

// ---------- AI ----------

const transcriptForAi = (words) => {
  const lines = [];
  let cur = [];
  words.forEach((w, i) => {
    if (cur.length && (w.start - words[i - 1].end > 0.35 || cur.length >= 18)) { lines.push(cur); cur = []; }
    cur.push(i);
  });
  if (cur.length) lines.push(cur);
  return lines.map((l) => `[${words[l[0]].start.toFixed(1)}s] ${l.map((i) => `${i}:${words[i].t}`).join(' ')}`).join('\n');
};

const refStats = (styleId) => (styleId ? getMeta('style', styleId)?.stats ?? null : null);
const densityHint = {low: '1 a cada ~25 s', medium: '1 a cada ~12 s', high: '1 a cada ~6 s'};

export const planWithAi = async (id, {model}, job) => {
  const f = files(id);
  const meta = getMeta('project', id);
  const style = sanitizeStyle(readJson(f.style));
  const words = readJson(f.words) ?? [];
  const info = readJson(f.info);
  const stats = refStats(meta.styleId);
  job.step('IA montando o plano de edição');
  const prompt = `Você vai editar um VÍDEO BRUTO replicando o modelo de edição de uma referência.

## Estilo a replicar
${JSON.stringify(style, null, 1)}

## Métricas da referência
${stats ? JSON.stringify(stats, null, 1) : '(indisponível)'}

## Bruto
Duração: ${info.duration.toFixed(1)} s · ${info.width}×${info.height}. Saída: ${style.format.aspect}.
Quadro do bruto (abra com Read para localizar o rosto): ${f.still}

## Transcrição do bruto (índice:palavra, agrupada por pausas; [tempo] = início da linha)
${transcriptForAi(words)}

## Tarefa
1. subject: onde está o rosto no quadro bruto (fx, fy de 0 a 1), para o recorte ${style.format.aspect} não cortar a cabeça.
2. dropWords: remova erros, gaguejos, frases repetidas (fique com a ÚLTIMA versão boa), falas de bastidor ("corta", "de novo", "deixa eu refazer") e vícios longos. Não remova conteúdo útil. Os silêncios já são cortados automaticamente.
3. emphasis: escolha palavras de impacto. "punch" (zoom de ênfase) com ritmo parecido com a referência (${stats ? `ela tem ${stats.cutsPerMin} cortes/min` : 'ritmo dinâmico'}); "highlight" nas palavras-chave para a legenda${style.captions.highlight === 'keywords' ? ' (o estilo destaca palavras-chave, marque de 1 a 2 por frase)' : ''}.
4. callouts: ${style.callouts.enabled ? `o estilo usa destaques (${style.callouts.style}), cerca de ${densityHint[style.callouts.frequency]}. Texto curto e forte (máx 5 palavras).` : 'o estilo NÃO usa destaques: retorne lista vazia.'}
5. sfx: poucos efeitos extras em momentos-chave (lista vazia se o estilo for limpo).
6. notes: resumo das decisões.`;
  const {data, costUsd, model: used} = await askClaude({prompt, schema: PLAN_SCHEMA, cwd: f.dir, model, onLine: (l) => l && job.log(l)});
  const plan = sanitizePlan(data, words.length);
  writeJson(f.plan, plan);
  job.cost(costUsd, used);
  job.log(plan.notes);
  return plan;
};

export const refineWithAi = async (id, {model, instruction}, job) => {
  const f = files(id);
  const meta = getMeta('project', id);
  const style = sanitizeStyle(readJson(f.style));
  const words = readJson(f.words) ?? [];
  const plan = sanitizePlan(readJson(f.plan), words.length);
  const history = (meta.chat ?? []).slice(-6).map((m) => `${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.text}`).join('\n');
  job.step('IA aplicando o ajuste');
  const prompt = `Você está ajustando uma edição automática. Aplique o pedido do usuário alterando o ESTILO e/ou o PLANO e devolva ambos completos (mantenha o que não foi pedido).

## Pedido
${instruction}

## Conversa anterior
${history || '(nenhuma)'}

## Estilo atual
${JSON.stringify(style, null, 1)}

## Plano atual (índices referem-se à transcrição)
${JSON.stringify(plan, null, 1)}

## Transcrição (índice:palavra)
${transcriptForAi(words)}`;
  const {data, costUsd, model: used} = await askClaude({prompt, schema: REFINE_SCHEMA, cwd: f.dir, model, onLine: (l) => l && job.log(l)});
  writeJson(f.style, sanitizeStyle(data.style));
  writeJson(f.plan, sanitizePlan(data.plan, words.length));
  job.cost(costUsd, used);
  saveMeta('project', id, {chat: [...(meta.chat ?? []), {role: 'user', text: instruction}, {role: 'ai', text: data.reply}].slice(-30)});
  job.log(data.reply);
  return data.reply;
};

// ---------- render ----------

/** Renders the whole edit, or only `frames` = [first, last] (the sample). */
export const renderProject = async (id, {port, frames, label = ''}, job) => {
  const f = files(id);
  const spec = readJson(f.spec);
  if (!spec) throw new Error('Gere a edição antes de renderizar');
  fs.mkdirSync(f.renders, {recursive: true});
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = path.join(f.renders, `${label}${stamp}.mp4`);
  const propsFile = path.join(f.dir, 'render-props.json');
  writeJson(propsFile, {spec, base: `http://localhost:${port}`});
  const emptyPublic = path.join(ROOT, 'lab', 'render-public');
  fs.mkdirSync(emptyPublic, {recursive: true});
  job.step(frames ? 'Renderizando a amostra' : 'Renderizando MP4');
  const range = frames ? [`--frames=${frames[0]}-${frames[1]}`] : [];
  await run('npx', ['remotion', 'render', 'src/index.ts', 'LabEdit', outFile, `--props=${propsFile}`, `--public-dir=${emptyPublic}`, '--codec=h264', '--crf=18', '--log=info', ...range], {
    onLine: (l) => {
      const m = /(\d+)\/(\d+)/.exec(l);
      if (m && /Render|Encod|frames/i.test(l)) job.progress(Number(m[1]) / Number(m[2]));
      else if (!/^\s*$/.test(l) && !/━/.test(l)) job.log(l.slice(0, 200));
    },
  });
  job.log(`Pronto: ${path.relative(ROOT, outFile)}`);
  return mediaUrl(outFile);
};

export const listRenders = (id) => {
  const dir = files(id).renders;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith('.mp4')).sort().reverse()
    .map((n) => ({name: n, url: mediaUrl(path.join(dir, n)), size: fs.statSync(path.join(dir, n)).size}));
};

export const projectFiles = files;
