import fs from 'node:fs';
import path from 'node:path';
import {askClaude} from './ai.mjs';
import {contactSheet, extractWav, fileExists, loudness, makeProxy, probe, sceneCuts, silences, still, transcribe} from './media.mjs';
import {sanitizeStyle} from './sanitize.mjs';
import {ASPECTS, STYLE_SCHEMA} from './schemas.mjs';
import {dirOf, getMeta, mediaUrl, readJson, saveMeta, writeJson} from './store.mjs';

const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r2 = (n) => Math.round(n * 100) / 100;

export const nearestAspect = (w, h) => Object.entries(ASPECTS).sort(([, a], [, b]) => Math.abs(a[0] / a[1] - w / h) - Math.abs(b[0] / b[1] - w / h))[0][0];

/** Numbers that describe the reference's rhythm (shared with the plan prompt). */
const computeStats = ({info, cuts, words, pauses, quiet, lufs}) => {
  const bounds = [0, ...cuts.filter((c) => c > 0.2 && c < info.duration - 0.2), info.duration];
  const shots = bounds.slice(1).map((b, i) => b - bounds[i]);
  // Whisper word timings are contiguous, so pauses come from the audio (-35 dB silences inside the speech range).
  const first = words[0]?.start ?? 0, last = words.at(-1)?.end ?? info.duration;
  const inner = pauses.map(([a, b]) => [Math.max(a, first), Math.min(b, last)]).filter(([a, b]) => b - a > 0.15);
  const gaps = inner.map(([a, b]) => b - a);
  const longGaps = inner.filter(([a, b]) => b - a > 0.4);
  // Share of those pauses that is also below -50 dB: near 0 means music/ambience under the voice.
  const gapTime = inner.reduce((s, [a, b]) => s + (b - a), 0);
  const silentInGaps = inner.reduce((s, [a, b]) => s + quiet.reduce((q, [x, y]) => q + Math.max(0, Math.min(b, y) - Math.max(a, x)), 0), 0);
  const speechSec = words.reduce((s, w) => s + (w.end - w.start), 0);
  return {
    durationSec: r2(info.duration), width: info.width, height: info.height, fps: r2(info.fps), aspect: nearestAspect(info.width, info.height),
    shots: shots.length, cutsPerMin: r2((cuts.length / info.duration) * 60), avgShotSec: r2(info.duration / shots.length), medianShotSec: r2(median(shots)),
    shortestShotSec: r2(Math.min(...shots)), longestShotSec: r2(Math.max(...shots)),
    words: words.length, wordsPerSec: r2(words.length / Math.max(1, info.duration)), speechCoverage: r2(speechSec / info.duration),
    medianPauseSec: r2(median(gaps)), pausesOver400ms: longGaps.length, longestPauseSec: r2(Math.max(0, ...gaps)),
    silentShareOfPauses: gapTime ? r2(silentInGaps / gapTime) : null, loudnessLufs: lufs,
  };
};

export const analyzeReference = async (id, {model, language}, job) => {
  const dir = dirOf('style', id);
  const meta = getMeta('style', id);
  if (!meta?.source) throw new Error('Envie o vídeo de referência primeiro');
  const refPath = path.join(dir, 'ref.mp4');
  const img = path.join(dir, 'frames');
  fs.mkdirSync(img, {recursive: true});

  job.step('Lendo o vídeo');
  const info = await probe(meta.source);
  job.log(`${info.width}×${info.height} · ${info.fps.toFixed(2)} fps · ${info.duration.toFixed(1)} s`);

  if (!fileExists(refPath) || meta.proxyOf !== meta.source) {
    job.step('Gerando proxy');
    await makeProxy(meta.source, refPath, {fps: 30, duration: info.duration, onProgress: (p) => job.progress(p)});
    saveMeta('style', id, {proxyOf: meta.source, video: mediaUrl(refPath)});
  }

  job.step('Transcrevendo fala (Whisper)');
  let words = readJson(path.join(dir, 'words.json'));
  if (!words && info.hasAudio) {
    const wav = path.join(dir, 'audio16k.wav');
    await extractWav(refPath, wav);
    words = await transcribe(wav, language, (p) => job.progress(p));
    writeJson(path.join(dir, 'words.json'), words);
    fs.rmSync(wav, {force: true});
  }
  words ??= [];
  job.log(`${words.length} palavras`);

  job.step('Medindo ritmo, cortes e áudio');
  const [cuts, pauses, quiet, lufs] = await Promise.all([
    sceneCuts(refPath),
    info.hasAudio ? silences(refPath, {noise: -35, minDur: 0.15}) : [],
    info.hasAudio ? silences(refPath, {noise: -50, minDur: 0.15}) : [],
    info.hasAudio ? loudness(refPath) : null,
  ]);
  const stats = computeStats({info, cuts, words, pauses, quiet, lufs});
  writeJson(path.join(dir, 'stats.json'), {...stats, cuts: cuts.map(r2)});
  job.log(`${stats.shots} planos · ${stats.cutsPerMin} cortes/min · plano médio ${stats.avgShotSec}s`);

  job.step('Extraindo quadros para a IA');
  const d = info.duration;
  const images = [];
  const n = Math.min(36, Math.max(12, Math.round(d / 1.5)));
  const sheets = Math.ceil(n / 12);
  const step = d / (sheets * 12);
  for (let k = 0; k < sheets; k++) {
    const file = path.join(img, `overview-${k + 1}.jpg`);
    const times = await contactSheet(refPath, {start: step / 2 + k * 12 * step, step, cols: 4, rows: 3, output: file});
    images.push({file, url: mediaUrl(file), kind: 'overview', label: `Visão geral ${k + 1}/${sheets} — grade 4×3, leitura esquerda→direita, cima→baixo, tempos (s): ${times.join(', ')}`});
  }
  for (const [i, at] of [0.3, 0.65].entries()) {
    const start = Math.max(0, Math.min(d - 2.1, d * at));
    const file = path.join(img, `burst-${i + 1}.jpg`);
    const times = await contactSheet(refPath, {start, step: 1 / 6, cols: 4, rows: 3, output: file});
    images.push({file, url: mediaUrl(file), kind: 'burst', label: `Sequência contínua ${i + 1} (6 quadros/s, mostra animação de legenda/zoom), tempos (s): ${times.join(', ')}`});
  }
  for (const [i, at] of [0.22, 0.5, 0.78].entries()) {
    const file = path.join(img, `still-${i + 1}.jpg`);
    await still(refPath, d * at, file, 720);
    images.push({file, url: mediaUrl(file), kind: 'still', label: `Quadro em resolução maior em t=${(d * at).toFixed(2)}s (para ler fonte, cores, contorno da legenda)`});
  }
  saveMeta('style', id, {images: images.map(({url, kind, label}) => ({url, kind, label})), stats});

  job.step('IA analisando o estilo de edição');
  const transcript = words.slice(0, 500).map((w) => `${w.start.toFixed(2)} ${w.t}`).join('\n');
  const prompt = `Analise este VÍDEO DE REFERÊNCIA e extraia o "modelo de edição" dele para que um template automático (Remotion) consiga replicar a mesma linguagem em outros vídeos brutos.

## Métricas medidas automaticamente
${JSON.stringify(stats, null, 1)}
Cortes de cena detectados (s): ${cuts.slice(0, 120).map(r2).join(', ') || 'nenhum'}

Como interpretar:
- cutsPerMin/avgShotSec alto ritmo = jump cuts. Se há muitos cortes durante a fala contínua, a referência remove pausas (removeSilences=true, maxPauseSec baixo).
- silentShareOfPauses perto de 0 = há trilha/som de fundo nas pausas (música); perto de 1 = pausas em silêncio total.
- longestPauseSec pequeno (< 0.5) = pausas cortadas agressivamente.

## Transcrição (tempo em s + palavra)
${transcript || '(sem fala)'}

## Imagens (abra TODAS com a ferramenta Read antes de responder)
${images.map((im) => `- ${im.file}\n  ${im.label}`).join('\n')}

## O que fazer
1. Abra cada imagem. Observe: proporção, enquadramento do rosto, variações de zoom entre planos (zoom a cada corte? punch-ins?), legendas (fonte mais próxima, peso, tamanho relativo, caixa alta, cores, contorno, caixa de fundo, posição vertical, quantas palavras aparecem por vez, palavra ativa destacada?), textos/títulos extras, transições, correção de cor, barra de progresso.
2. Compare a sequência contínua para entender a animação (pop, slide, karaokê) e o comportamento do zoom.
3. Preencha o JSON do estilo. Escolha a fonte da lista mais parecida visualmente. Estime tamanhos em % do lado menor do vídeo.
4. Em "notes", liste o que o template não reproduz (b-roll, memes, gráficos, emojis animados, etc.) e dicas práticas.`;
  const {data, costUsd, model: used} = await askClaude({prompt, schema: STYLE_SCHEMA, cwd: dir, model, onLine: (l) => l && job.log(l)});
  const style = sanitizeStyle(data);
  writeJson(path.join(dir, 'style.json'), style);
  job.cost(costUsd, used);
  saveMeta('style', id, {name: meta.nameLocked ? meta.name : style.name || meta.name, analyzed: true, stats});
  return style;
};
