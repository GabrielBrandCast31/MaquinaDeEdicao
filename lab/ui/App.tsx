import React, {useCallback, useEffect, useState} from 'react';
import {api, fmtSec, type ProjectMeta, type State, type StyleMeta} from './api';
import {LibraryView} from './LibraryView';
import {ProjectView} from './ProjectView';
import {StyleView} from './StyleView';

type Sel = {kind: 'style' | 'project'; id: string} | {kind: 'library'} | null;

const readPref = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const writePref = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

export const App: React.FC = () => {
  const [state, setState] = useState<State>({styles: [], projects: [], music: [], running: []});
  const [sel, setSelRaw] = useState<Sel>(() => { try { return JSON.parse(readPref('lab.sel', 'null')); } catch { return null; } });
  const [model, setModel] = useState(() => readPref('lab.model', 'sonnet'));
  const [language, setLanguage] = useState(() => readPref('lab.lang', 'pt'));
  const setSel = (s: Sel) => { setSelRaw(s); writePref('lab.sel', JSON.stringify(s)); };

  const refresh = useCallback(async () => {
    const s = await api.get<State>('/api/state');
    setState(s);
    setSelRaw((cur) => (cur && cur.kind !== 'library' && !(cur.kind === 'style' ? s.styles : s.projects).some((x) => x.id === cur.id) ? null : cur));
  }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 2000); return () => clearInterval(t); }, [refresh]);

  const isRunning = (kind: string, id: string) => state.running.some((r) => r.target === `${kind}:${id}`);
  const openTarget = (target: string) => { const [kind, id] = target.split(':'); setSel({kind: kind as 'style' | 'project', id}); };
  const newStyle = async (blank = false) => {
    const s = await api.post<StyleMeta>('/api/styles', blank ? {name: 'Estilo em branco', blank: true} : {});
    await refresh();
    setSel({kind: 'style', id: s.id});
  };
  const newProject = async () => {
    const p = await api.post<ProjectMeta>('/api/projects', {styleId: state.styles.find((s) => s.analyzed)?.id ?? null});
    await refresh();
    setSel({kind: 'project', id: p.id});
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="logo" aria-hidden>▶</span>Lab de Edição</div>
        <div className="top-controls">
          <label>IA
            <select value={model} onChange={(e) => { setModel(e.target.value); writePref('lab.model', e.target.value); }}>
              <option value="sonnet">Sonnet (rápido, barato)</option>
              <option value="opus">Opus (mais preciso)</option>
            </select>
          </label>
          <label>Idioma da fala
            <select value={language} onChange={(e) => { setLanguage(e.target.value); writePref('lab.lang', e.target.value); }}>
              <option value="pt">Português</option>
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
            </select>
          </label>
        </div>
      </header>

      <aside className="sidebar">
        <button className={`side-lib ${sel?.kind === 'library' ? 'side-on' : ''}`} onClick={() => setSel({kind: 'library'})}>
          <span className="side-lib-icon" aria-hidden>♪</span>
          <span><strong>Biblioteca de efeitos</strong><span className="side-meta">sons e efeitos visuais</span></span>
        </button>
        {state.running.length > 0 && (
          <div className="side-sec side-tasks">
            <div className="side-head"><span>Rodando agora · {state.running.length}</span></div>
            {state.running.map((r) => (
              <button key={r.id} className="task-item" onClick={() => openTarget(r.target)}>
                <span className="task-top"><span className="side-name">{r.name}</span><span className="side-meta mono">{fmtSec((Date.now() - r.startedAt) / 1000)}</span></span>
                <span className="side-meta">{r.step || 'iniciando…'}</span>
                {r.waiting && <span className="task-wait">na fila: {r.waiting}</span>}
                <div className={`bar ${r.progress == null ? 'bar-indeterminate' : ''}`}><div style={{width: `${Math.round((r.progress ?? 0.3) * 100)}%`}} /></div>
              </button>
            ))}
          </div>
        )}
        <div className="side-sec">
          <div className="side-head"><span>Referências</span><button className="icon-btn" title="Nova referência" onClick={() => newStyle()}>+</button></div>
          {state.styles.length === 0 && <p className="side-empty">Envie um vídeo editado que você quer copiar.<br /><button className="link" onClick={() => newStyle(true)}>ou comece com o estilo padrão</button></p>}
          {state.styles.map((s) => (
            <button key={s.id} className={`side-item ${sel?.kind === 'style' && sel.id === s.id ? 'side-on' : ''}`} onClick={() => setSel({kind: 'style', id: s.id})}>
              <span className={`dot ${isRunning('style', s.id) ? 'dot-run' : s.analyzed ? 'dot-ok' : ''}`} />
              <span className="side-name">{s.name}</span>
              <span className="side-meta">{isRunning('style', s.id) ? 'analisando' : s.analyzed ? `${s.stats?.cutsPerMin ?? '–'} c/min` : s.source ? 'pronto p/ analisar' : 'sem vídeo'}</span>
            </button>
          ))}
        </div>
        <div className="side-sec">
          <div className="side-head"><span>Projetos</span><button className="icon-btn" title="Novo projeto" onClick={newProject}>+</button></div>
          {state.projects.length === 0 && <p className="side-empty">Crie um projeto, envie o bruto e escolha um estilo.</p>}
          {state.projects.map((p) => (
            <button key={p.id} className={`side-item ${sel?.kind === 'project' && sel.id === p.id ? 'side-on' : ''}`} onClick={() => setSel({kind: 'project', id: p.id})}>
              <span className={`dot ${isRunning('project', p.id) ? 'dot-run' : p.built ? 'dot-ok' : ''}`} />
              <span className="side-name">{p.name}</span>
              <span className="side-meta">{isRunning('project', p.id) ? state.running.find((r) => r.target === `project:${p.id}`)?.step : p.built ? fmtSec(p.durationSec) : p.source ? 'pronto p/ gerar' : 'sem bruto'}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="main">
        {sel?.kind === 'style' && <StyleView key={sel.id} id={sel.id} model={model} language={language} onChanged={refresh} onOpenProject={(id) => setSel({kind: 'project', id})} />}
        {sel?.kind === 'project' && <ProjectView key={sel.id} id={sel.id} state={state} model={model} language={language} onChanged={refresh} />}
        {sel?.kind === 'library' && <LibraryView />}
        {!sel && (
          <div className="welcome">
            <h1>Replique qualquer edição.</h1>
            <ol className="how">
              <li><strong>Referência</strong><span>Envie um vídeo editado. A IA mede o ritmo dos cortes, os zooms, as legendas, as cores e o som, e transforma isso num modelo de edição que você pode ajustar.</span></li>
              <li><strong>Projeto</strong><span>Envie o seu bruto. O Whisper transcreve, as pausas são cortadas e a IA escolhe o que tirar, onde dar zoom e o que destacar.</span></li>
              <li><strong>Ajuste e exporte</strong><span>Veja o preview na hora, peça mudanças em português e renderize o MP4 com o Remotion.</span></li>
            </ol>
            <div className="row-gap">
              <button className="btn btn-primary" onClick={() => newStyle()}>Enviar referência</button>
              <button className="btn" onClick={newProject}>Novo projeto</button>
              <button className="btn btn-ghost" onClick={() => setSel({kind: 'library'})}>Ver efeitos</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
