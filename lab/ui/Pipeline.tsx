import React, {useEffect, useRef, useState} from 'react';
import {api, fmtSec, type ProjectDetail} from './api';

const PRESETS = [
  'Estilo Apple: fundo escuro, tipografia grande, números que contam, ícones minimalistas em SVG. Quando eu citar números ou listas, tela cheia com a câmera em janela.',
  'Motion de Reels dinâmico: emojis e setas desenhadas, palavras-chave explodindo na tela, muitos pops e whooshes, cores vibrantes.',
  'VSL premium: cards de vidro (glassmorphism) com dados, checklists que se marcam, comparativos antes/depois, mockups de celular.',
  'Minimalista: só lower-thirds elegantes e títulos de seção. Nada cobrindo o rosto.',
];

type Props = {
  d: ProjectDetail;
  running: boolean;
  start: (path: string, body?: object) => void;
  model: string;
  language: string;
  onSaved: (d: ProjectDetail) => void;
};

/** Staged flow: brief → 8–20 s sample → approve → full video. */
export const Pipeline: React.FC<Props> = ({d, running, start, model, language, onSaved}) => {
  const {meta, spec} = d;
  const id = meta.id;
  const [prompt, setPrompt] = useState(meta.motionPrompt ?? '');
  const [enabled, setEnabled] = useState(meta.motionEnabled !== false);
  const [startSec, setStartSec] = useState(meta.sample?.startSec ?? 0);
  const [lenSec, setLenSec] = useState(meta.sample?.lenSec ?? 15);
  const [feedback, setFeedback] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { setPrompt(meta.motionPrompt ?? ''); setEnabled(meta.motionEnabled !== false); }, [id]);

  const save = (patch: object) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => onSaved(await api.put<ProjectDetail>(`/api/projects/${id}/meta`, patch)), 400);
  };
  const saveNow = async () => {
    clearTimeout(timer.current);
    await api.put(`/api/projects/${id}/meta`, {motionPrompt: prompt, motionEnabled: enabled, sample: {startSec, lenSec}});
  };
  const generate = async (extra: object = {}) => { await saveNow(); start(`/api/projects/${id}/sample`, {model, language, ...extra}); };

  const stage = meta.stage ?? 'draft';
  const hasSource = Boolean(meta.source);
  const total = spec ? spec.durationInFrames / spec.fps : meta.durationSec;
  const steps: [string, boolean, boolean][] = [
    ['Amostra', stage === 'sampling', ['sample-ready', 'full', 'done'].includes(stage)],
    ['Sua aprovação', stage === 'sample-ready', ['full', 'done'].includes(stage)],
    ['Vídeo completo', stage === 'full', stage === 'done'],
  ];

  return (
    <div className="pipeline">
      <ol className="stages">
        {steps.map(([label, active, ok], i) => (
          <li key={label} className={`${active ? 'stage-on' : ''} ${ok ? 'stage-ok' : ''}`}><span>{ok ? '✓' : i + 1}</span>{label}</li>
        ))}
      </ol>

      <section className="brief">
        <div className="brief-head">
          <h3 className="h3">Prompt de motion</h3>
          <label className="field-bool"><input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); save({motionEnabled: e.target.checked}); }} /><span>Criar motion graphics</span></label>
        </div>
        <textarea
          rows={4}
          disabled={!enabled}
          placeholder="Descreva as animações que você quer: estilo visual, quando entrar tela cheia, o que animar (números, listas, ícones), cores, ritmo, efeitos sonoros…"
          value={prompt}
          onChange={(e) => { setPrompt(e.target.value); save({motionPrompt: e.target.value}); }}
        />
        {enabled && (
          <div className="chips">
            {PRESETS.map((p) => <button key={p} className="chip" title={p} onClick={() => { setPrompt(p); save({motionPrompt: p}); }}>{p.split(':')[0]}</button>)}
          </div>
        )}
        <div className="sample-controls">
          <label className="field">
            <span>Início da amostra <em className="mono">{fmtSec(startSec)}</em></span>
            <input type="range" min={0} max={Math.max(0, (total ?? 60) - lenSec)} step={0.5} value={startSec} onChange={(e) => { setStartSec(Number(e.target.value)); save({sample: {startSec: Number(e.target.value), lenSec}}); }} />
          </label>
          <label className="field">
            <span>Duração <em className="mono">{lenSec}s</em></span>
            <input type="range" min={8} max={20} step={1} value={lenSec} onChange={(e) => { setLenSec(Number(e.target.value)); save({sample: {startSec, lenSec: Number(e.target.value)}}); }} />
          </label>
          <div className="row-gap">
            <button className="btn btn-primary" disabled={!hasSource || running} onClick={() => generate({replan: !d.plan})}>
              {stage === 'draft' ? 'Gerar amostra' : 'Gerar nova amostra'}
            </button>
            <button className="btn btn-sm" disabled={!hasSource || running} title="Só cortes automáticos e estilo, sem chamar o Claude" onClick={() => generate({skipAi: true})}>Sem IA</button>
          </div>
        </div>
        {!hasSource && <p className="muted small">Envie o vídeo bruto acima para começar.</p>}
      </section>

      {meta.sample?.url && ['sample-ready', 'full', 'done'].includes(stage) && (
        <section className="approval">
          <video key={meta.sample.url} src={meta.sample.url} controls playsInline />
          <div className="approval-body">
            <span className="eyebrow">Amostra · {fmtSec(meta.sample.startSec)}–{fmtSec(meta.sample.startSec + meta.sample.lenSec)}</span>
            <h3 className="h3">{stage === 'done' ? 'Amostra aprovada' : 'Confira a amostra'}</h3>
            <p className="muted small">Cortes, legendas{enabled ? ', motion' : ''} e som exatamente como vão ficar. Aprovando, a IA faz o resto do vídeo na mesma linguagem e renderiza o MP4 completo.</p>
            {stage === 'sample-ready' && (
              <>
                <button className="btn btn-primary" disabled={running} onClick={() => start(`/api/projects/${id}/approve`, {model})}>Aprovar e fazer o resto →</button>
                <div className="feedback">
                  <textarea rows={3} placeholder="Não gostou? Diga o que mudar (ex: motion mais limpo, legenda menor, zoom mais suave) e refaça só a amostra." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                  <button className="btn" disabled={running || !feedback.trim()} onClick={() => { generate({feedback}); setFeedback(''); }}>Refazer amostra com ajuste</button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {stage === 'done' && meta.finalUrl && (
        <section className="approval approval-final">
          <video key={meta.finalUrl} src={meta.finalUrl} controls playsInline />
          <div className="approval-body">
            <span className="eyebrow">Concluído</span>
            <h3 className="h3">Vídeo completo pronto</h3>
            <p className="muted small">Ainda dá para ajustar pelo chat ou pelos controles e renderizar de novo na aba Exportar.</p>
            <a className="btn btn-primary" href={meta.finalUrl} download>Baixar MP4</a>
          </div>
        </section>
      )}
    </div>
  );
};
