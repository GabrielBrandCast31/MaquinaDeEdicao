import React, {useEffect, useState} from 'react';
import {ASPECTS, FONTS, SFX, type StyleProfile} from '../../src/lab/types';

type F =
  | {k: string; label: string; t: 'bool'}
  | {k: string; label: string; t: 'num'; min: number; max: number; step: number}
  | {k: string; label: string; t: 'enum'; opts: readonly (string | null)[]; names?: Record<string, string>}
  | {k: string; label: string; t: 'color'};

const n = (k: string, label: string, min: number, max: number, step: number): F => ({k, label, t: 'num', min, max, step});
const b = (k: string, label: string): F => ({k, label, t: 'bool'});
const e = (k: string, label: string, opts: readonly (string | null)[], names?: Record<string, string>): F => ({k, label, t: 'enum', opts, names});
const c = (k: string, label: string): F => ({k, label, t: 'color'});
const sfxOpts = [null, ...SFX];

const SECTIONS: {title: string; fields: F[]}[] = [
  {title: 'Formato', fields: [e('format.aspect', 'Proporção', Object.keys(ASPECTS)), n('format.fps', 'FPS', 24, 60, 1)]},
  {title: 'Ritmo e cortes', fields: [b('pacing.removeSilences', 'Cortar pausas'), n('pacing.maxPauseSec', 'Pausa máxima (s)', 0.1, 2, 0.05), n('pacing.padBeforeSec', 'Folga antes (s)', 0, 0.5, 0.01), n('pacing.padAfterSec', 'Folga depois (s)', 0, 0.6, 0.01)]},
  {title: 'Câmera', fields: [
    n('camera.baseZoom', 'Zoom base', 1, 1.6, 0.01), e('camera.zoomOnCut', 'Zoom nos cortes', ['none', 'alternate', 'random'], {none: 'Nenhum', alternate: 'Alternado', random: 'Aleatório'}),
    n('camera.cutZoomScale', 'Zoom do plano fechado', 1, 1.6, 0.01), n('camera.punchScale', 'Punch-in', 1, 1.6, 0.01),
    e('camera.punchStyle', 'Tipo de punch', ['cut', 'smooth'], {cut: 'Seco', smooth: 'Suave'}), n('camera.punchHoldSec', 'Duração do punch (s)', 0.2, 4, 0.1),
    n('camera.slowPushIn', 'Zoom lento contínuo', 0, 0.2, 0.01), b('camera.shakeOnPunch', 'Tremida no punch'),
  ]},
  {title: 'Legendas', fields: [
    b('captions.enabled', 'Mostrar legendas'), e('captions.mode', 'Modo', ['word-by-word', 'phrase', 'karaoke'], {'word-by-word': 'Palavra a palavra', phrase: 'Frase', karaoke: 'Karaokê'}),
    n('captions.wordsPerCaption', 'Palavras por bloco', 1, 10, 1), n('captions.yPct', 'Posição vertical (%)', 5, 95, 1),
    e('captions.font', 'Fonte', FONTS), n('captions.weight', 'Peso', 400, 900, 100), n('captions.sizePct', 'Tamanho', 2, 14, 0.1),
    b('captions.uppercase', 'Caixa alta'), c('captions.color', 'Cor'), c('captions.highlightColor', 'Cor de destaque'),
    e('captions.highlight', 'Destacar', ['active-word', 'keywords', 'none'], {'active-word': 'Palavra falada', keywords: 'Palavras-chave', none: 'Nada'}),
    b('captions.activeWordBox', 'Caixa na palavra destacada'), c('captions.strokeColor', 'Contorno'), n('captions.strokeWidth', 'Espessura do contorno', 0, 16, 0.5),
    b('captions.shadow', 'Sombra'), b('captions.box.enabled', 'Caixa de fundo'), c('captions.box.color', 'Cor da caixa'), n('captions.box.opacity', 'Opacidade da caixa', 0, 1, 0.05),
    n('captions.box.radius', 'Raio da caixa', 0, 60, 1), e('captions.animation', 'Animação', ['pop', 'slide-up', 'fade', 'bounce', 'none'], {pop: 'Pop', 'slide-up': 'Subir', fade: 'Fade', bounce: 'Quicar', none: 'Nenhuma'}),
  ]},
  {title: 'Textos de destaque', fields: [
    b('callouts.enabled', 'Usar destaques'), e('callouts.style', 'Formato', ['bold-center', 'lower-third', 'sticker'], {'bold-center': 'Grande no centro', 'lower-third': 'Tarja inferior', sticker: 'Adesivo'}),
    e('callouts.font', 'Fonte', FONTS), c('callouts.color', 'Cor do texto'), c('callouts.accentColor', 'Cor de apoio'),
    e('callouts.frequency', 'Frequência', ['low', 'medium', 'high'], {low: 'Baixa', medium: 'Média', high: 'Alta'}),
  ]},
  {title: 'Transições', fields: [e('transitions.type', 'Tipo', ['none', 'flash', 'whip', 'zoom-blur', 'glitch'], {none: 'Corte seco', flash: 'Flash', whip: 'Chicote', 'zoom-blur': 'Zoom blur', glitch: 'Glitch'}), n('transitions.every', 'A cada N cortes', 0, 20, 1)]},
  {title: 'Cor', fields: [n('grade.contrast', 'Contraste', 0.6, 1.5, 0.01), n('grade.saturation', 'Saturação', 0, 1.8, 0.01), n('grade.brightness', 'Brilho', 0.6, 1.4, 0.01), n('grade.warmth', 'Temperatura', -1, 1, 0.05), n('grade.vignette', 'Vinheta', 0, 1, 0.05), n('grade.grain', 'Granulação', 0, 1, 0.05)]},
  {title: 'Barra de progresso', fields: [b('progressBar.enabled', 'Mostrar'), c('progressBar.color', 'Cor'), e('progressBar.position', 'Posição', ['top', 'bottom'], {top: 'Topo', bottom: 'Base'})]},
  {title: 'Áudio', fields: [
    b('audio.music.enabled', 'Trilha'), n('audio.music.volume', 'Volume da trilha', 0, 0.6, 0.01), b('audio.music.duckUnderVoice', 'Abaixar sob a voz'),
    e('audio.sfx.onCut', 'SFX nas transições', sfxOpts), e('audio.sfx.onPunch', 'SFX no punch', sfxOpts), e('audio.sfx.onCallout', 'SFX nos destaques', sfxOpts), n('audio.sfx.volume', 'Volume dos SFX', 0, 1, 0.05),
  ]},
];

const get = (o: unknown, k: string): unknown => k.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], o);
const set = <T,>(o: T, k: string, v: unknown): T => {
  const [h, ...rest] = k.split('.');
  const cur = (o as Record<string, unknown>)[h];
  return {...o, [h]: rest.length ? set(cur as object, rest.join('.'), v) : v};
};

const Field: React.FC<{f: F; value: unknown; onChange: (v: unknown) => void}> = ({f, value, onChange}) => {
  if (f.t === 'bool') return <label className="field field-bool"><input type="checkbox" checked={Boolean(value)} onChange={(ev) => onChange(ev.target.checked)} /><span>{f.label}</span></label>;
  if (f.t === 'color') return <label className="field"><span>{f.label}</span><span className="color-row"><input type="color" value={String(value)} onChange={(ev) => onChange(ev.target.value.toUpperCase())} /><code>{String(value)}</code></span></label>;
  if (f.t === 'enum') {
    return (
      <label className="field"><span>{f.label}</span>
        <select value={value === null ? '' : String(value)} onChange={(ev) => onChange(ev.target.value === '' ? null : ev.target.value)}>
          {f.opts.map((o) => <option key={o ?? '∅'} value={o ?? ''}>{o === null ? '— nenhum —' : f.names?.[o] ?? o}</option>)}
        </select>
      </label>
    );
  }
  const v = Number(value);
  return (
    <label className="field"><span>{f.label} <em className="mono">{Number.isInteger(f.step) ? v : v.toFixed(2)}</em></span>
      <input type="range" min={f.min} max={f.max} step={f.step} value={v} onChange={(ev) => onChange(Number(ev.target.value))} />
    </label>
  );
};

/** Form over every StyleProfile knob. Calls onChange with the full updated style. */
export const StyleEditor: React.FC<{style: StyleProfile; onChange: (s: StyleProfile) => void}> = ({style, onChange}) => {
  const [open, setOpen] = useState<string>('Legendas');
  const [json, setJson] = useState('');
  const [jsonErr, setJsonErr] = useState('');
  useEffect(() => setJson(JSON.stringify(style, null, 2)), [style]);
  return (
    <div className="editor">
      {SECTIONS.map((s) => (
        <section key={s.title} className={`sec ${open === s.title ? 'sec-open' : ''}`}>
          <button className="sec-head" onClick={() => setOpen(open === s.title ? '' : s.title)} aria-expanded={open === s.title}>
            <span>{s.title}</span><span className="chev">›</span>
          </button>
          {open === s.title && (
            <div className="sec-body">
              {s.fields.map((f) => <Field key={f.k} f={f} value={get(style, f.k)} onChange={(v) => onChange(set(style, f.k, v))} />)}
            </div>
          )}
        </section>
      ))}
      <section className={`sec ${open === 'json' ? 'sec-open' : ''}`}>
        <button className="sec-head" onClick={() => setOpen(open === 'json' ? '' : 'json')}><span>JSON avançado</span><span className="chev">›</span></button>
        {open === 'json' && (
          <div className="sec-body sec-body-full">
            <textarea className="code" spellCheck={false} value={json} onChange={(ev) => setJson(ev.target.value)} rows={18} />
            {jsonErr && <p className="error-text">{jsonErr}</p>}
            <button className="btn" onClick={() => { try { onChange(JSON.parse(json)); setJsonErr(''); } catch (err) { setJsonErr((err as Error).message); } }}>Aplicar JSON</button>
          </div>
        )}
      </section>
    </div>
  );
};
