import React, {useEffect, useRef, useState} from 'react';
import {api, fmtUsd, type EffectsReport, type Job, type JobStep} from './api';

/** Polls a job until it finishes; calls onDone once. */
export const useJob = (jobId: string | undefined | null, onDone: (job: Job) => void) => {
  const [job, setJob] = useState<Job | null>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!jobId) { setJob(null); return; }
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const j = await api.get<Job>(`/api/jobs/${jobId}`);
        if (!alive) return;
        setJob(j);
        if (j.status === 'running') timer = setTimeout(tick, 900);
        else done.current(j);
      } catch {
        if (alive) setJob(null); // server restarted: job is gone
      }
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [jobId]);
  return job;
};

export const JobPanel: React.FC<{job: Job | null}> = ({job}) => {
  const logRef = useRef<HTMLPreElement>(null);
  useEffect(() => { logRef.current?.scrollTo({top: logRef.current.scrollHeight}); }, [job?.log.length]);
  if (!job) return null;
  const secs = Math.round(((job.endedAt ?? Date.now()) - job.startedAt) / 1000);
  return (
    <div className={`job job-${job.status}`}>
      <div className="job-head">
        {job.status === 'running' ? <span className="spinner" /> : <span className="job-dot" />}
        <strong>{job.status === 'error' ? 'Falhou' : job.status === 'done' ? 'Concluído' : job.step || 'Iniciando…'}</strong>
        {job.status === 'running' && job.waiting && <span className="pill pill-wait">Na fila: {job.waiting}</span>}
        <span className="muted mono">{secs}s{job.costUsd ? ` · IA ${fmtUsd(job.costUsd)}` : ''}</span>
        {job.status === 'running' && <button className="btn btn-sm btn-ghost" onClick={() => api.post(`/api/jobs/${job.id}/cancel`)}>Cancelar</button>}
      </div>
      {job.steps?.length ? (
        <ol className="job-steps">{job.steps.map((s, i) => <StepRow key={i} s={s} />)}</ol>
      ) : job.status === 'running' && (
        <div className={`bar ${job.progress == null ? 'bar-indeterminate' : ''}`}><div style={{width: `${Math.round((job.progress ?? 0.3) * 100)}%`}} /></div>
      )}
      {job.error && <p className="error-text">{job.error}</p>}
      <pre ref={logRef} className="log">{job.log.slice(-60).join('\n')}</pre>
    </div>
  );
};

const StepRow: React.FC<{s: JobStep}> = ({s}) => {
  const secs = Math.round(((s.endedAt ?? Date.now()) - s.startedAt) / 1000);
  const indeterminate = s.status === 'running' && s.progress == null;
  const pct = s.status === 'done' ? 100 : Math.round((s.progress ?? 0.3) * 100);
  return (
    <li className={`job-step job-step-${s.status} ${s.parallel ? 'job-step-par' : ''}`}>
      <span className="job-step-icon">{s.status === 'running' ? <span className="spinner" /> : s.status === 'done' ? '✓' : '✗'}</span>
      <span className="job-step-label">{s.label}{s.status === 'running' && s.waiting ? <em className="job-wait"> · na fila: {s.waiting}</em> : null}</span>
      <span className="muted mono">{s.status === 'running' && s.progress != null ? `${pct}% · ` : ''}{secs}s</span>
      <div className={`bar ${indeterminate ? 'bar-indeterminate' : ''}`}><div style={{width: `${pct}%`}} /></div>
    </li>
  );
};

/** Drag-and-drop / click upload, or a local path (better for big files: nothing is copied). */
export const SourcePicker: React.FC<{label: string; hint: string; uploadUrl: string; pathUrl: string; accept?: string; onDone: () => void; compact?: boolean}> = ({label, hint, uploadUrl, pathUrl, accept = 'video/*', onDone, compact}) => {
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [localPath, setLocalPath] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const send = async (file: File) => {
    setError(''); setProgress(0);
    try { await api.upload(uploadUrl, file, setProgress); onDone(); } catch (e) { setError((e as Error).message); } finally { setProgress(null); }
  };
  const usePath = async () => {
    setError('');
    try { await api.post(pathUrl, {path: localPath}); setLocalPath(''); onDone(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className={`picker ${compact ? 'picker-compact' : ''}`}>
      <div
        className={`drop ${drag ? 'drop-over' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) send(f); }}
      >
        <input ref={input} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) send(f); e.target.value = ''; }} />
        {progress !== null ? (
          <>
            <strong>Enviando… {Math.round(progress * 100)}%</strong>
            <div className="bar"><div style={{width: `${progress * 100}%`}} /></div>
          </>
        ) : (
          <>
            <UploadIcon />
            <strong>{label}</strong>
            <span className="muted">{hint}</span>
          </>
        )}
      </div>
      <div className="path-row">
        <input placeholder="…ou cole o caminho do arquivo no Mac (não copia, ideal para arquivos grandes)" value={localPath} onChange={(e) => setLocalPath(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && localPath && usePath()} />
        <button className="btn" disabled={!localPath} onClick={usePath}>Usar</button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
};

const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 16V4m0 0l-5 5m5-5l5 5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></svg>
);

export const Tabs = <T extends string>({tabs, value, onChange}: {tabs: [T, string][]; value: T; onChange: (t: T) => void}) => (
  <div className="tabs" role="tablist">
    {tabs.map(([k, label]) => (
      <button key={k} role="tab" aria-selected={value === k} className={`tab ${value === k ? 'tab-on' : ''}`} onClick={() => onChange(k)}>{label}</button>
    ))}
  </div>
);

export const Stat: React.FC<{label: string; value: React.ReactNode}> = ({label, value}) => (
  <div className="stat"><span className="stat-v mono">{value}</span><span className="stat-l">{label}</span></div>
);

export const EditableTitle: React.FC<{value: string; onSave: (v: string) => void}> = ({value, onSave}) => {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <input className="title-input" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v.trim() && v !== value && onSave(v.trim())} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />;
};

/** "Efeitos usados": every sound and visual effect of a render, shown under the video. */
export const EffectsList: React.FC<{report: EffectsReport | null | undefined; txtUrl?: string | null; collapsed?: boolean}> = ({report, txtUrl, collapsed}) => {
  const [copied, setCopied] = useState(false);
  if (!report) return null;
  const counts = Object.entries(report.sounds.counts).sort((a, b) => b[1] - a[1]);
  const total = counts.reduce((n, [, c]) => n + c, 0);
  const copy = async () => {
    try { await navigator.clipboard.writeText(report.text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <details className="fx-report" open={!collapsed}>
      <summary>
        <span className="eyebrow">Efeitos usados</span>
        <span className="muted small">{total} sons · {report.visuals.length + report.motion.length} efeitos visuais</span>
      </summary>
      <div className="row-gap fx-actions">
        <button className="btn btn-sm" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar lista'}</button>
        {txtUrl && <a className="btn btn-sm btn-ghost" href={txtUrl} download>Baixar .txt</a>}
      </div>
      <div className="fx-cols">
        <section>
          <h4>Efeitos sonoros</h4>
          {counts.length ? <div className="fx-chips">{counts.map(([n, c]) => <span key={n} className="pill mono">{n} ×{c}</span>)}</div> : <p className="muted small">Nenhum.</p>}
          {report.sounds.edit.length > 0 && (
            <ul className="fx-list">{report.sounds.edit.map((x, i) => <li key={i}><span className="mono">{x.at}</span>{x.label} <span className="muted">({x.name}) · {x.source}</span></li>)}</ul>
          )}
          {report.sounds.motion.length > 0 && (
            <>
              <h5>Nas cenas de motion</h5>
              <ul className="fx-list">{report.sounds.motion.map((x, i) => <li key={i}><span className="mono">{x.at}</span>{x.scene}: <span className="muted">{x.names.join(', ')}</span></li>)}</ul>
            </>
          )}
          <p className="small">Trilha: {report.sounds.music ? `${report.sounds.music.name} (volume ${report.sounds.music.volume})` : 'nenhuma'}</p>
        </section>
        <section>
          <h4>Efeitos visuais</h4>
          <ul className="fx-list">
            {report.visuals.map((v, i) => (
              <li key={i}>
                <span className="fx-group">{v.group}</span>{v.label}{v.detail && <span className="muted"> · {v.detail}</span>}
                {v.times.length > 0 && <span className="fx-times mono">{v.times.join(' · ')}</span>}
              </li>
            ))}
          </ul>
          {report.motion.length > 0 && (
            <>
              <h5>Cenas de motion ({report.motion.length})</h5>
              <ul className="fx-list">
                {report.motion.map((m, i) => (
                  <li key={i}>
                    <span className="mono">{m.at}–{m.until}</span><strong>{m.id}</strong> <span className="muted">· {m.layer}{m.camera ? ` · ${m.camera}` : ''}</span>
                    {m.what && <span className="fx-what">{m.what}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </details>
  );
};
