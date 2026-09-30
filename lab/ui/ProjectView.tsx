import {Player, type PlayerRef} from '@remotion/player';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {LabEdit} from '../../src/lab/LabEdit';
import type {LabProps, StyleProfile} from '../../src/lab/types';
import {api, fmtMb, fmtSec, fmtUsd, type ProjectDetail, type State} from './api';
import {BriefView} from './BriefView';
import {EditableTitle, EffectsList, JobPanel, SourcePicker, Stat, Tabs, useJob} from './components';
import {Pipeline} from './Pipeline';
import {StyleEditor} from './StyleEditor';

type Tab = 'ai' | 'brief' | 'style' | 'plan' | 'export';

export const ProjectView: React.FC<{id: string; state: State; model: string; language: string; onChanged: () => void}> = ({id, state, model, language, onChanged}) => {
  const [d, setD] = useState<ProjectDetail | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('ai');
  const [err, setErr] = useState('');
  const [instruction, setInstruction] = useState('');
  const [planText, setPlanText] = useState('');
  const [opening, setOpening] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const player = useRef<PlayerRef>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    const x = await api.get<ProjectDetail>(`/api/projects/${id}`);
    setD(x);
    setPlanText(x.plan ? JSON.stringify(x.plan, null, 2) : '');
    return x;
  }, [id]);
  useEffect(() => { setD(null); setErr(''); load().then((x) => setJobId(x.meta.job ?? null)); }, [id, load]);
  const job = useJob(jobId, (j) => { load(); onChanged(); if (j.kind === 'render' && j.status === 'done') setTab('export'); });
  const running = job?.status === 'running';

  const start = async (path: string, body: object = {}) => {
    setErr('');
    try { const j = await api.post<{id: string}>(path, body); setJobId(j.id); onChanged(); } catch (e) { setErr((e as Error).message); }
  };
  const act = async (fn: () => Promise<ProjectDetail>) => {
    setErr('');
    try { const x = await fn(); setD(x); setPlanText(x.plan ? JSON.stringify(x.plan, null, 2) : ''); onChanged(); } catch (e) { setErr((e as Error).message); }
  };

  // Style edits: instant preview locally, then server rebuilds timing (pauses, captions, transitions).
  const editStyle = (style: StyleProfile) => {
    if (!d) return;
    setD({...d, style, spec: d.spec ? {...d.spec, style} : d.spec});
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => act(() => api.put<ProjectDetail>(`/api/projects/${id}/style`, {style})), 450);
  };

  const inputProps = useMemo<LabProps>(() => ({spec: d?.spec ?? null, base: ''}), [d?.spec]);

  /** Opens this edit in Remotion Studio. The tab is opened right away (popup blockers) and pointed at the Studio once it is up. */
  const openEditor = async () => {
    setErr('');
    setOpening(true);
    const tab = window.open('', '_blank');
    tab?.document.write('<body style="background:#0c0c0f;color:#ececf1;font:15px -apple-system,sans-serif;display:grid;place-items:center;height:100vh;margin:0">Abrindo o Remotion Studio… (na primeira vez leva uns segundos)</body>');
    try {
      const {url} = await api.post<{url: string}>(`/api/projects/${id}/open-studio`);
      if (tab && !tab.closed) tab.location.href = url; else window.open(url, '_blank');
    } catch (e) {
      tab?.close();
      setErr((e as Error).message);
    } finally {
      setOpening(false);
    }
  };

  // A new transcript re-indexes every word, so the AI plan and the motion scenes are redone.
  const confirmTranscriptChange = () => (!d?.plan && !d?.spec) || confirm('Trocar a transcrição refaz o plano da IA, os cortes e o motion deste projeto. Continuar?');
  const uploadTranscript = async (file: File) => {
    if (!confirmTranscriptChange()) return;
    setErr('');
    try { await api.upload(`/api/projects/${id}/transcript`, file, () => {}); await load(); onChanged(); } catch (e) { setErr((e as Error).message); }
  };
  const savePastedTranscript = async () => {
    if (!confirmTranscriptChange()) return;
    await act(() => api.post<ProjectDetail>(`/api/projects/${id}/transcript-text`, {text: pasteText}));
    setPasting(false); setPasteText('');
  };
  const removeTranscript = () => { if (confirmTranscriptChange()) act(() => api.del<ProjectDetail>(`/api/projects/${id}/transcript`)); };

  if (!d) return <div className="main-pad muted">Carregando…</div>;
  const {meta, spec} = d;
  const hasSource = Boolean(meta.source);

  return (
    <div className="main-pad">
      <header className="page-head">
        <div>
          <span className="eyebrow">Projeto</span>
          <EditableTitle value={meta.name} onSave={(name) => act(() => api.put<ProjectDetail>(`/api/projects/${id}/meta`, {name}))} />
        </div>
        <div className="head-actions">
          {meta.costUsd ? <span className="pill mono" title="Custo estimado das chamadas ao Claude neste projeto">IA {fmtUsd(meta.costUsd)}</span> : null}
          <button className="btn" disabled={!spec || opening} title={spec ? 'Abre esta edição no Remotion Studio, com a timeline completa' : 'Gere uma amostra primeiro'} onClick={openEditor}>
            {opening ? <><span className="spinner" /> Abrindo…</> : <><EditorIcon /> Abrir no editor</>}
          </button>
          <button className="btn btn-ghost" onClick={async () => { if (confirm(`Apagar o projeto "${meta.name}" e todos os renders?`)) { await api.del(`/api/projects/${id}`); onChanged(); } }}>Apagar</button>
        </div>
      </header>

      <div className="steps">
        <div className={`step ${hasSource ? 'step-ok' : ''}`}>
          <span className="step-n">1</span>
          <div className="step-body">
            <strong>Vídeo bruto</strong>
            {hasSource ? (
              <span className="muted small ellipsis" title={meta.source}>{meta.sourceName} · <button className="link" disabled={running} onClick={() => act(() => api.post<ProjectDetail>(`/api/projects/${id}/clear-source`))}>trocar</button></span>
            ) : <span className="muted small">Gravação sem edição</span>}
          </div>
        </div>
        <div className="step step-ok">
          <span className="step-n">2</span>
          <div className="step-body">
            <strong>Estilo</strong>
            <select value={meta.styleId ?? ''} onChange={(e) => act(() => api.post<ProjectDetail>(`/api/projects/${id}/use-style`, {styleId: e.target.value || null}))}>
              <option value="">Padrão Reels (sem referência)</option>
              {state.styles.filter((s) => s.analyzed).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className={`step ${meta.music ? 'step-ok' : ''}`}>
          <span className="step-n">3</span>
          <div className="step-body">
            <strong>Trilha</strong>
            <select value={meta.music ?? ''} onChange={(e) => act(() => api.post<ProjectDetail>(`/api/projects/${id}/music-select`, {url: e.target.value || null}))}>
              <option value="">Sem trilha</option>
              {state.music.map((m) => <option key={m.url} value={m.url}>{m.name}</option>)}
              {meta.music && !state.music.some((m) => m.url === meta.music) && <option value={meta.music}>Trilha enviada</option>}
            </select>
            <label className="link small">enviar arquivo<input type="file" accept="audio/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await api.upload(`/api/projects/${id}/music`, f, () => {}); load(); } }} /></label>
          </div>
        </div>
        <div className={`step ${meta.transcript ? 'step-ok' : ''}`}>
          <span className="step-n">4</span>
          <div className="step-body">
            <strong>Transcrição</strong>
            {meta.transcript ? (
              <span className="muted small ellipsis" title={meta.transcript.timed ? 'Os tempos vêm do arquivo' : 'Texto sem tempos: o Whisper roda só para sincronizar, o texto das legendas é o seu'}>
                {meta.transcript.name} · {meta.transcript.words} palavras{meta.transcript.timed ? '' : ' · sincroniza'} · <button className="link" disabled={running} onClick={removeTranscript}>remover</button>
              </span>
            ) : <span className="muted small">Automática (Whisper)</span>}
            <span className="small row-gap">
              <label className={`link ${running ? 'link-off' : ''}`}>enviar arquivo<input type="file" accept=".srt,.vtt,.json,.txt" hidden disabled={running} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTranscript(f); e.target.value = ''; }} /></label>
              <button className="link" disabled={running} onClick={() => setPasting((v) => !v)}>colar texto</button>
            </span>
          </div>
        </div>
        <div className={`step ${meta.motionEnabled !== false && meta.motionPrompt ? 'step-ok' : ''}`}>
          <span className="step-n">5</span>
          <div className="step-body">
            <strong>Motion</strong>
            <span className="muted small ellipsis">{meta.motionEnabled === false ? 'Desligado' : meta.motionPrompt ? meta.motionPrompt : 'Escreva o prompt abaixo'}</span>
          </div>
        </div>
      </div>

      {pasting && (
        <div className="paste">
          <div className="paste-head">
            <strong>Colar transcrição</strong>
            <span className="muted small">SRT ou VTT (com tempos) são usados direto. Texto corrido é sincronizado com a fala pelo Whisper e as legendas saem com o seu texto, sem erros de digitação.</span>
          </div>
          <textarea rows={8} className="code" placeholder={'1\n00:00:01,000 --> 00:00:03,200\nOlá, pessoal!\n\n…ou só o texto do roteiro'} value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
          <div className="row-gap">
            <button className="btn btn-primary" disabled={running || !pasteText.trim()} onClick={savePastedTranscript}>Usar esta transcrição</button>
            <button className="btn btn-ghost" onClick={() => setPasting(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {!hasSource && (
        <SourcePicker label="Arraste o vídeo bruto" hint="Talking head, VSL, gravação de celular… MP4 ou MOV" uploadUrl={`/api/projects/${id}/source`} pathUrl={`/api/projects/${id}/source-path`} onDone={load} />
      )}
      {err && <p className="error-text">{err}</p>}
      <JobPanel job={job} />
      <Pipeline d={d} running={running} start={start} model={model} language={language} onSaved={(x) => setD((cur) => (cur ? {...cur, meta: x.meta} : x))} />

      {spec && (
        <div className="studio">
          <div className="stage">
            <div className="player-wrap" style={{aspectRatio: `${spec.width} / ${spec.height}`, width: `min(100%, calc(72vh * ${spec.width / spec.height}))`}}>
              <Player
                ref={player}
                component={LabEdit}
                inputProps={inputProps}
                durationInFrames={spec.durationInFrames}
                fps={spec.fps}
                compositionWidth={spec.width}
                compositionHeight={spec.height}
                style={{width: '100%', height: '100%'}}
                controls
                clickToPlay
                spaceKeyToPlayOrPause
                acknowledgeRemotionLicense
                {...(meta.stage === 'sample-ready' && meta.sample?.to ? {inFrame: meta.sample.from, outFrame: meta.sample.to} : {})}
              />
            </div>
            <div className="stats stats-row">
              <Stat label="duração" value={fmtSec(spec.durationInFrames / spec.fps)} />
              <Stat label="cortes" value={spec.clips.length} />
              <Stat label="punches" value={spec.punches.length} />
              <Stat label="legendas" value={spec.captions.length} />
              <Stat label="destaques" value={spec.callouts.length} />
            </div>
          </div>

          <div className="panel">
            <Tabs<Tab> tabs={[['ai', 'Pedir à IA'], ['brief', 'Briefing'], ['style', 'Ajustes'], ['plan', 'Plano'], ['export', 'Exportar']]} value={tab} onChange={setTab} />

            {tab === 'ai' && (
              <div className="chat">
                <div className="chat-log">
                  {d.plan?.notes && <div className="msg msg-ai"><span className="eyebrow">Plano da IA</span>{d.plan.notes}</div>}
                  {(meta.chat ?? []).map((m, i) => <div key={i} className={`msg msg-${m.role}`}>{m.text}</div>)}
                </div>
                <div className="chips">
                  {['Mais zooms de ênfase', 'Legenda amarela com contorno preto', 'Ritmo mais rápido, corta mais pausas', 'Adicione títulos de destaque nos pontos-chave', 'Deixe mais limpo, sem efeitos sonoros'].map((c) => (
                    <button key={c} className="chip" onClick={() => setInstruction(c)}>{c}</button>
                  ))}
                </div>
                <textarea rows={3} placeholder="Ex: tira o trecho onde eu erro no começo, destaca a palavra 'grátis' e usa transição flash nos cortes" value={instruction} onChange={(e) => setInstruction(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && instruction.trim()) { start(`/api/projects/${id}/refine`, {model, instruction}); setInstruction(''); } }} />
                <button className="btn btn-primary" disabled={running || !instruction.trim()} onClick={() => { start(`/api/projects/${id}/refine`, {model, instruction}); setInstruction(''); }}>Aplicar ajuste ⌘↵</button>
              </div>
            )}

            {tab === 'brief' && <BriefView id={id} running={running} />}

            {tab === 'style' && (
              <div>
                <StyleEditor style={d.style} onChange={editStyle} />
                <button className="btn btn-sm" onClick={async () => { const name = prompt('Nome do novo estilo:', `${d.style.name} (ajustado)`); if (name) { await api.post(`/api/projects/${id}/save-style`, {name}); onChanged(); } }}>Salvar como novo estilo</button>
              </div>
            )}

            {tab === 'plan' && (
              <div className="plan">
                {d.plan ? (
                  <>
                    <p className="muted small">{d.plan.dropWords.length} trechos removidos · {d.plan.emphasis.length} ênfases · {d.plan.callouts.length} destaques. Os índices apontam para as {d.words} palavras transcritas.</p>
                    {d.plan.dropWords.length > 0 && (
                      <ul className="drops">{d.plan.dropWords.map((x, i) => <li key={i}><code>{x.from}–{x.to}</code> {x.reason}</li>)}</ul>
                    )}
                    <textarea className="code" spellCheck={false} rows={16} value={planText} onChange={(e) => setPlanText(e.target.value)} />
                    <button className="btn" onClick={() => { try { const plan = JSON.parse(planText); act(() => api.put<ProjectDetail>(`/api/projects/${id}/plan`, {plan})); } catch (e) { setErr(`JSON inválido: ${(e as Error).message}`); } }}>Salvar plano e remontar</button>
                  </>
                ) : <p className="muted">Sem plano de IA (edição gerada só com cortes automáticos).</p>}
              </div>
            )}

            {tab === 'export' && (
              <div className="export">
                <button className="btn btn-primary" disabled={running} onClick={() => start(`/api/projects/${id}/render`)}>Renderizar MP4</button>
                <div className="row-gap">
                  <button className="btn btn-sm" disabled={opening} onClick={openEditor}>{opening ? 'Abrindo…' : 'Abrir no editor (Remotion Studio)'}</button>
                  <button className="btn btn-sm" onClick={() => api.post(`/api/projects/${id}/reveal`)}>Abrir pasta</button>
                </div>
                <p className="muted small">No Studio, a composição <code>LabEdit</code> mostra a última edição gerada. Dá para abrir no Claude Code e criar cenas sob medida em cima dela.</p>
                {d.renders.length === 0 ? <p className="muted">Nenhum render ainda.</p> : (
                  <ul className="renders">
                    {d.renders.map((r) => (
                      <li key={r.name}>
                        <video src={r.url} controls preload="metadata" />
                        <div><span className="mono small">{r.name}</span><span className="muted small">{fmtMb(r.size)}</span><a className="btn btn-sm" href={r.url} download>Baixar</a></div>
                        <EffectsList report={r.report} txtUrl={r.reportUrl} collapsed />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const EditorIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 14h18M8 18v2m8-2v2M7 9l2 2-2 2m4 0h3" /></svg>
);
