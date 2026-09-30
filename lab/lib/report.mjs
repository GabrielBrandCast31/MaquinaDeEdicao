// "Efeitos usados": every sound and visual effect in a render, listed under the video in the Lab.
// Built from the spec (cuts, punches, captions, callouts, transitions, sfx) plus a static read of the
// AI-written motion scenes (their <Sfx> tags and the descriptions saved when they were generated).
import fs from 'node:fs';
import path from 'node:path';
import {motionDir, sceneFiles} from './motion.mjs';
import {SFX_LIBRARY} from './schemas.mjs';
import {dirOf, readJson} from './store.mjs';

export const reportFiles = (mp4) => ({json: mp4.replace(/\.mp4$/, '.efeitos.json'), txt: mp4.replace(/\.mp4$/, '.efeitos.txt')});
export const motionNotesFile = (id) => path.join(dirOf('project', id), 'motion-notes.json');

const LABEL = Object.fromEntries(SFX_LIBRARY.map((s) => [s.name, s.label]));
const SRC = {cut: 'no corte', punch: 'no punch-in', callout: 'no destaque', plan: 'escolhido pela IA'};
const CAM = {full: 'câmera cheia', hidden: 'sem câmera', 'pip-right': 'câmera em janela à direita', 'pip-left': 'câmera em janela à esquerda', 'pip-top': 'câmera em janela no topo', bubble: 'câmera em bolinha'};
const CAPTION_MODE = {'word-by-word': 'palavra por palavra', phrase: 'frase', karaoke: 'karaokê'};
const CALLOUT = {'bold-center': 'título central', 'lower-third': 'lower-third', sticker: 'adesivo'};
const TRANSITION = {flash: 'flash', whip: 'chicote', 'zoom-blur': 'zoom com desfoque', glitch: 'glitch'};

const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/** Scenes declared in a motion file: {id, startWord, endWord?, durationSec?, layer, camera?, sfx[]}. */
const readScenes = (file) => {
  const src = fs.readFileSync(file, 'utf8');
  const arr = /scenes\s*:\s*MotionScene\[\]\s*=\s*\[([\s\S]*?)\];/.exec(src)?.[1] ?? '';
  // Top-level definitions, to find which <Sfx> tags belong to each scene component (and its helpers).
  const defs = new Map();
  const heads = [...src.matchAll(/^(?:export\s+)?(?:const|function)\s+(\w+)/gm)];
  heads.forEach((m, i) => defs.set(m[1], src.slice(m.index, heads[i + 1]?.index ?? src.length)));
  const sfxOf = (name, seen = new Set()) => {
    if (seen.has(name) || !defs.has(name)) return [];
    seen.add(name);
    const body = defs.get(name);
    const own = [...body.matchAll(/<Sfx\b[^>]*?\bname=\{?["'`]([\w-]+)["'`]/g)].map((m) => m[1]);
    const nested = [...body.matchAll(/<([A-Z]\w*)/g)].flatMap((m) => sfxOf(m[1], seen));
    return [...own, ...nested];
  };
  return [...arr.matchAll(/\{([^{}]*\bComponent\s*:\s*(\w+)[^{}]*)\}/g)].map((m) => {
    const body = m[1];
    const field = (k) => new RegExp(`\\b${k}\\s*:\\s*['"]?([\\w.-]+)`).exec(body)?.[1];
    return {
      id: field('id') ?? m[2], startWord: Number(field('startWord')),
      endWord: field('endWord') === undefined ? undefined : Number(field('endWord')),
      durationSec: field('durationSec') === undefined ? undefined : Number(field('durationSec')),
      layer: field('layer') ?? 'over', camera: field('camera'), hideCaptions: /hideCaptions\s*:\s*true/.test(body),
      sfx: sfxOf(m[2]),
    };
  }).filter((s) => Number.isFinite(s.startWord));
};

/** Same placement rule as LabEdit's placeScenes. */
const place = (spec, sc) => {
  const first = spec.words.find((w) => w.ri >= sc.startWord);
  if (!first) return null;
  let end = first.f + Math.round((sc.durationSec ?? 3) * spec.fps);
  if (sc.endWord !== undefined) {
    const last = [...spec.words].reverse().find((w) => w.ri <= sc.endWord);
    if (last && last.e > first.f) end = last.e + 4;
  }
  return {from: first.f, to: Math.min(end, spec.durationInFrames)};
};

/** frames = [first, last] for a sample render, or undefined for the whole edit. */
export const effectsReport = (id, spec, frames) => {
  const [a, b] = frames ?? [0, spec.durationInFrames - 1];
  const fps = spec.fps;
  const inRange = (f) => f >= a && f <= b;
  const t = (f) => clock((f - a) / fps);
  const s = spec.style;
  const notes = readJson(motionNotesFile(id)) ?? {};

  // ---- motion scenes ----
  const dir = motionDir(id);
  const scenes = [];
  for (const file of sceneFiles(id)) {
    const what = Object.fromEntries((notes[file]?.scenes ?? []).map((x) => [x.id, x.what]));
    for (const sc of readScenes(path.join(dir, file))) {
      const p = place(spec, sc);
      if (!p || !(p.to >= a && p.from <= b)) continue;
      scenes.push({...sc, file, from: p.from, to: p.to, what: what[sc.id] ?? ''});
    }
  }
  scenes.sort((x, y) => x.from - y.from);

  // ---- sounds ----
  const editSfx = spec.sfx.filter((x) => inRange(x.f)).map((x) => ({at: t(x.f), name: x.name, label: LABEL[x.name] ?? x.name, source: SRC[x.src] ?? 'na edição'}));
  const motionSfx = scenes.filter((x) => x.sfx.length).map((x) => ({at: t(x.from), scene: x.id, names: x.sfx}));
  const counts = {};
  for (const n of [...editSfx.map((x) => x.name), ...motionSfx.flatMap((x) => x.names)]) counts[n] = (counts[n] ?? 0) + 1;
  const music = spec.music ? {name: decodeURIComponent(spec.music.url.split('/').pop()), volume: spec.music.volume} : null;

  // ---- visuals ----
  const visuals = [];
  const add = (group, label, detail = '', times = []) => visuals.push({group, label, detail, times});
  const clips = spec.clips.filter((c) => c.from + c.dur > a && c.from <= b);
  add('Cortes', `${Math.max(0, clips.length - 1)} jump cuts`, s.pacing.removeSilences ? `pausas acima de ${s.pacing.maxPauseSec}s removidas` : 'pausas mantidas', clips.slice(1).map((c) => t(c.from)));
  if (s.camera.zoomOnCut !== 'none') add('Câmera', 'Zoom nos cortes', `${s.camera.zoomOnCut === 'alternate' ? 'alternado' : 'aleatório'} entre ${s.camera.baseZoom}× e ${s.camera.cutZoomScale}×`);
  const punches = spec.punches.filter((p) => inRange(p.f));
  if (punches.length) add('Câmera', `${punches.length} punch-in${punches.length > 1 ? 's' : ''}`, `${s.camera.punchStyle === 'smooth' ? 'suave' : 'seco'}, ${s.camera.punchScale}×${s.camera.shakeOnPunch ? ', com tremida' : ''}`, punches.map((p) => t(p.f)));
  if (s.camera.slowPushIn > 0) add('Câmera', 'Push-in lento', `${s.camera.slowPushIn} a cada 10 s de plano`);
  const trans = spec.transitions.filter((x) => inRange(x.f));
  if (trans.length) add('Transições', `${trans.length}× ${TRANSITION[s.transitions.type] ?? s.transitions.type}`, `a cada ${s.transitions.every} cortes`, trans.map((x) => t(x.f)));
  const caps = spec.captions.filter((c) => c.b >= a && c.a <= b);
  if (s.captions.enabled && caps.length) {
    const c = s.captions;
    add('Legendas', `${caps.length} legendas · ${CAPTION_MODE[c.mode] ?? c.mode}`, [`${c.font} ${c.weight}`, c.uppercase && 'maiúsculas', `animação ${c.animation}`, c.highlight !== 'none' && `destaque ${c.highlight === 'keywords' ? 'nas palavras-chave' : 'na palavra falada'} ${c.highlightColor}`, c.strokeWidth > 0 && 'contorno', c.box.enabled && 'caixa de fundo', c.shadow && 'sombra'].filter(Boolean).join(' · '));
  }
  const callouts = spec.callouts.filter((x) => inRange(x.f));
  if (callouts.length) add('Destaques na tela', `${callouts.length} ${CALLOUT[s.callouts.style] ?? s.callouts.style}`, `${s.callouts.font}, ${s.callouts.color}`, callouts.map((x) => `${t(x.f)} “${x.text}”`));
  const g = s.grade;
  const pct = (v) => `${v > 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;
  const grade = [g.contrast !== 1 && `contraste ${pct(g.contrast)}`, g.saturation !== 1 && `saturação ${pct(g.saturation)}`, g.brightness !== 1 && `brilho ${pct(g.brightness)}`, g.warmth && (g.warmth > 0 ? 'mais quente' : 'mais frio'), g.vignette > 0 && `vinheta ${g.vignette}`, g.grain > 0 && `granulação ${g.grain}`].filter(Boolean);
  if (grade.length) add('Cor', 'Correção de cor', grade.join(' · '));
  if (s.progressBar.enabled) add('Interface', 'Barra de progresso', `${s.progressBar.position === 'top' ? 'no topo' : 'embaixo'}, ${s.progressBar.color}`);
  const motion = scenes.map((x) => ({at: t(x.from), until: t(x.to), id: x.id, layer: x.layer === 'full' ? 'tela cheia' : 'sobreposição', camera: x.layer === 'full' ? CAM[x.camera ?? 'hidden'] : '', what: x.what, sfx: x.sfx}));

  const title = frames ? `Amostra ${clock(a / fps)}–${clock((b + 1) / fps)}` : `Vídeo completo · ${clock(spec.durationInFrames / fps)}`;
  const report = {title, sounds: {edit: editSfx, motion: motionSfx, counts, music}, visuals, motion};
  report.text = toText(report);
  return report;
};

const toText = (r) => {
  const L = [`EFEITOS USADOS — ${r.title}`, ''];
  const total = Object.values(r.sounds.counts).reduce((x, y) => x + y, 0);
  L.push(`EFEITOS SONOROS (${total})`);
  const summary = Object.entries(r.sounds.counts).sort((x, y) => y[1] - x[1]).map(([n, c]) => `${LABEL[n] ?? n} (${n}) ×${c}`);
  if (summary.length) L.push(`Resumo: ${summary.join(' · ')}`);
  if (r.sounds.edit.length) { L.push('', 'Na edição:'); for (const x of r.sounds.edit) L.push(`  ${x.at}  ${x.label} (${x.name}) — ${x.source}`); }
  if (r.sounds.motion.length) { L.push('', 'Nas cenas de motion:'); for (const x of r.sounds.motion) L.push(`  ${x.at}  ${x.scene}: ${x.names.join(', ')}`); }
  L.push('', `Trilha: ${r.sounds.music ? `${r.sounds.music.name} (volume ${r.sounds.music.volume})` : 'nenhuma'}`, '', 'EFEITOS VISUAIS');
  for (const v of r.visuals) L.push(`${v.group}: ${v.label}${v.detail ? ` — ${v.detail}` : ''}${v.times.length ? `\n  ${v.times.join(' · ')}` : ''}`);
  if (r.motion.length) {
    L.push('', `Cenas de motion (${r.motion.length}):`);
    for (const m of r.motion) L.push(`  ${m.at}–${m.until}  ${m.id} · ${m.layer}${m.camera ? ` · ${m.camera}` : ''}${m.what ? ` — ${m.what}` : ''}${m.sfx.length ? ` [sons: ${m.sfx.join(', ')}]` : ''}`);
  }
  return L.join('\n');
};
