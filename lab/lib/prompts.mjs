// Project brief ("prompt pai") + one template per stage (lab/prompts/*.md).
// Every AI call of a project is parentPrompt(id) + the stage's own prompt, so stages that run apart
// (and motion blocks that run in parallel) share the same editing context.
import fs from 'node:fs';
import path from 'node:path';
import {dirOf, getMeta, readJson, ROOT, writeJson} from './store.mjs';

const DIR = path.join(ROOT, 'lab', 'prompts');
const briefFile = (id) => path.join(dirOf('project', id), 'brief.json');

/** Fills {{name}} placeholders; unknown names become empty. Templates are re-read on every call so edits apply right away. */
export const fill = (name, vars = {}) => fs.readFileSync(path.join(DIR, `${name}.md`), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? '')).trim();

/**
 * brief.json: {overview, audience, tone, sections[{fromWord,toWord,topic,intent}], visual, blocks[{index,fromSec,toSec,focus,avoid,bridge}],
 *              notes (client's fixed notes), overviewKey, rosterKey}
 */
export const getBrief = (id) => readJson(briefFile(id)) ?? {};
export const saveBrief = (id, patch) => {
  const next = {...getBrief(id), ...patch};
  writeJson(briefFile(id), next);
  return next;
};
export const clearBrief = (id, keys) => {
  const b = getBrief(id);
  for (const k of keys) delete b[k];
  writeJson(briefFile(id), b);
};

const styleText = (s) => {
  const c = s.captions, cam = s.camera;
  return [
    s.summary || s.name,
    `- Ritmo: ${s.pacing.removeSilences ? `corta pausas acima de ${s.pacing.maxPauseSec}s` : 'mantém as pausas'}`,
    `- Câmera: zoom base ${cam.baseZoom}×, zoom nos cortes ${cam.zoomOnCut}, punch ${cam.punchScale}× (${cam.punchStyle})${cam.shakeOnPunch ? ' com tremida' : ''}${cam.slowPushIn ? `, push-in lento ${cam.slowPushIn}` : ''}`,
    `- Legenda: ${c.enabled ? `${c.mode}, ${c.font} ${c.weight}, texto ${c.color}, destaque ${c.highlightColor} (${c.highlight}), animação ${c.animation}, em ${c.yPct}% da altura` : 'desligada'}`,
    `- Destaques: ${s.callouts.enabled ? `${s.callouts.style}, ${s.callouts.font}, cor ${s.callouts.color}, apoio ${s.callouts.accentColor}, frequência ${s.callouts.frequency}` : 'não usa'}`,
    `- Transição: ${s.transitions.type}${s.transitions.type !== 'none' ? ` a cada ${s.transitions.every} cortes` : ''}`,
    `- Som: efeito no corte ${s.audio.sfx.onCut ?? '—'}, no punch ${s.audio.sfx.onPunch ?? '—'}, no destaque ${s.audio.sfx.onCallout ?? '—'}; trilha ${s.audio.music.enabled ? 'sim' : 'não'}`,
  ].join('\n');
};

export const sectionsText = (sections, words) => (sections?.length
  ? sections.map((x) => `- ${x.fromWord}–${x.toWord}${words?.[x.fromWord] ? ` (${words[x.fromWord].start.toFixed(0)}s no bruto)` : ''}: ${x.topic} → ${x.intent}`).join('\n')
  : '(ainda não mapeado)');

/** Sections that overlap the raw word range [a, b]. */
export const sectionsIn = (id, a, b) => {
  const s = (getBrief(id).sections ?? []).filter((x) => x.toWord >= a && x.fromWord <= b);
  return s.length ? s.map((x) => `- ${x.topic} → ${x.intent}`).join('\n') : '(sem mapa)';
};

export const parentPrompt = (id) => {
  const meta = getMeta('project', id) ?? {};
  const dir = dirOf('project', id);
  const style = readJson(path.join(dir, 'style.json'));
  const words = readJson(path.join(dir, 'words.json'));
  const info = readJson(path.join(dir, 'info.json'));
  const b = getBrief(id);
  return fill('pai', {
    projeto: meta.name ?? id,
    formato: style ? `${style.format.aspect} @ ${style.format.fps} fps${info ? ` · bruto de ${info.duration.toFixed(0)} s` : ''}` : '',
    pedido: meta.motionEnabled === false ? '(motion desligado: só cortes, legendas, zooms e sons)' : meta.motionPrompt?.trim() || 'Motion graphics que reforcem as ideias-chave da fala: números, listas, contrastes, CTAs. Visual limpo e moderno.',
    estilo: style ? styleText(style) : '(padrão)',
    visao: b.overview ? `${b.overview}\nPúblico: ${b.audience}\nTom: ${b.tone}` : '(ainda não escrita)',
    secoes: sectionsText(b.sections, words),
    visual: b.visual || '(definida pela amostra — ainda não aprovada)',
    observacoes: b.notes?.trim() || '(nenhuma)',
  });
};

/** Parent prompt + the stage template. */
export const stagePrompt = (id, stage, vars) => `${parentPrompt(id)}\n\n---\n\n${fill(stage, vars)}`;
