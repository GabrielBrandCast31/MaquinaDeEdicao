import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {StyleProfile} from '../../src/lab/types';
import {api, fmtSec, fmtUsd, type ProjectMeta, type StyleDetail} from './api';
import {EditableTitle, JobPanel, SourcePicker, Stat, useJob} from './components';
import {StyleEditor} from './StyleEditor';

export const StyleView: React.FC<{id: string; model: string; language: string; onChanged: () => void; onOpenProject: (id: string) => void}> = ({id, model, language, onChanged, onOpenProject}) => {
  const [d, setD] = useState<StyleDetail | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    const x = await api.get<StyleDetail>(`/api/styles/${id}`);
    setD(x);
    return x;
  }, [id]);
  useEffect(() => { setD(null); setErr(''); load().then((x) => setJobId(x.meta.job ?? null)); }, [id, load]);
  const job = useJob(jobId, () => { load(); onChanged(); });

  if (!d) return <div className="main-pad muted">Carregando…</div>;
  const {meta, style} = d;
  const running = job?.status === 'running';
  const s = meta.stats;

  const analyze = async () => {
    setErr('');
    try { const j = await api.post<{id: string}>(`/api/styles/${id}/analyze`, {model, language}); setJobId(j.id); onChanged(); } catch (e) { setErr((e as Error).message); }
  };
  const saveStyle = (st: StyleProfile) => {
    setD({...d, style: st});
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => api.put(`/api/styles/${id}/style`, {style: st}), 500);
  };
  const newProject = async () => {
    const p = await api.post<ProjectMeta>('/api/projects', {name: `Edição · ${meta.name}`, styleId: id});
    onChanged();
    onOpenProject(p.id);
  };
  const remove = async () => {
    if (!confirm(`Apagar a referência "${meta.name}" e os arquivos dela?`)) return;
    await api.del(`/api/styles/${id}`);
    onChanged();
  };

  return (
    <div className="main-pad">
      <header className="page-head">
        <div>
          <span className="eyebrow">Referência</span>
          <EditableTitle value={meta.name} onSave={async (name) => { await api.put(`/api/styles/${id}/style`, {name}); load(); onChanged(); }} />
        </div>
        <div className="head-actions">
          {meta.costUsd ? <span className="pill mono">IA {fmtUsd(meta.costUsd)}</span> : null}
          {style && <button className="btn btn-primary" onClick={newProject}>Usar em um projeto →</button>}
          <button className="btn btn-ghost" onClick={remove}>Apagar</button>
        </div>
      </header>

      {!meta.source && !style && (
        <SourcePicker label="Arraste o vídeo de referência" hint="O vídeo já editado cujo estilo você quer copiar (Reels, TikTok, VSL…)" uploadUrl={`/api/styles/${id}/source`} pathUrl={`/api/styles/${id}/source-path`} onDone={load} />
      )}

      {meta.source && !meta.analyzed && !running && (
        <div className="callout">
          <div>
            <strong>{meta.sourceName}</strong>
            <p className="muted">A análise gera um proxy, transcreve com Whisper, mede cortes/ritmo/áudio e manda quadros para o Claude ({model}) descrever o modelo de edição.</p>
          </div>
          <button className="btn btn-primary" onClick={analyze}>Analisar referência</button>
        </div>
      )}
      {err && <p className="error-text">{err}</p>}
      <JobPanel job={job} />

      {meta.video && (
        <div className="ref-grid">
          <div className="ref-video">
            <video src={meta.video} controls playsInline />
          </div>
          <div className="ref-info">
            {s && (
              <div className="stats">
                <Stat label="cortes / min" value={s.cutsPerMin} />
                <Stat label="plano médio" value={fmtSec(Number(s.avgShotSec))} />
                <Stat label="palavras / s" value={s.wordsPerSec} />
                <Stat label="maior pausa" value={fmtSec(Number(s.longestPauseSec))} />
                <Stat label="duração" value={fmtSec(Number(s.durationSec))} />
                <Stat label="formato" value={s.aspect} />
              </div>
            )}
            {style && (
              <>
                <p className="summary">{style.summary}</p>
                {style.notes.length > 0 && (
                  <div className="notes">
                    <span className="eyebrow">O que o template não replica sozinho</span>
                    <ul>{style.notes.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                )}
                {meta.analyzed && !running && <button className="btn btn-ghost btn-sm" onClick={analyze}>Reanalisar</button>}
              </>
            )}
          </div>
        </div>
      )}

      {style && (
        <div className="split-2">
          <div>
            <h3 className="h3">Modelo de edição extraído</h3>
            <p className="muted small">Ajuste o que a IA errou. Isso vira o padrão de todo projeto que usar esta referência.</p>
            <StyleEditor style={style} onChange={saveStyle} />
          </div>
          {meta.images && meta.images.length > 0 && (
            <div>
              <h3 className="h3">Quadros que a IA analisou</h3>
              <div className="frames">
                {meta.images.map((im) => (
                  <figure key={im.url}><img src={`${im.url}?v=${meta.updatedAt ?? 0}`} alt={im.label} loading="lazy" /><figcaption>{im.label.split(' — ')[0].split(' (')[0]}</figcaption></figure>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
