import React, {useCallback, useEffect, useState} from 'react';
import {api, fmtSec, type Brief, type BriefDetail} from './api';

/**
 * The project's parent prompt ("prompt pai"). Every AI stage (plan, chat adjustments, sample motion,
 * the parallel motion blocks, code fixes) receives it before its own instructions.
 */
export const BriefView: React.FC<{id: string; running: boolean}> = ({id, running}) => {
  const [d, setD] = useState<BriefDetail | null>(null);
  const [draft, setDraft] = useState<Brief>({});
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState('');
  const [showParent, setShowParent] = useState(false);

  const load = useCallback(async () => {
    const x = await api.get<BriefDetail>(`/api/projects/${id}/brief`);
    setD(x); setDraft(x.brief); setDirty(false);
  }, [id]);
  // Reload when a job finishes (the AI may have written new parts).
  useEffect(() => { if (!running) load().catch((e) => setErr((e as Error).message)); }, [load, running]);

  const set = (patch: Partial<Brief>) => { setDraft((b) => ({...b, ...patch})); setDirty(true); };
  const setBlock = (index: number, patch: Partial<NonNullable<Brief['blocks']>[number]>) =>
    set({blocks: (draft.blocks ?? []).map((b) => (b.index === index ? {...b, ...patch} : b))});
  const save = async () => {
    setErr('');
    try { const x = await api.put<BriefDetail>(`/api/projects/${id}/brief`, draft); setD(x); setDraft(x.brief); setDirty(false); } catch (e) { setErr((e as Error).message); }
  };

  if (!d) return <p className="muted">Carregando…</p>;
  const b = draft;
  return (
    <div className="brief-view">
      <p className="muted small">O prompt pai vai em todas as chamadas de IA deste projeto, antes do prompt de cada etapa. Os templates ficam em <code>lab/prompts/</code>.</p>

      <label>Visão geral do vídeo
        <textarea rows={4} placeholder="A IA escreve na primeira amostra." value={b.overview ?? ''} onChange={(e) => set({overview: e.target.value})} />
      </label>
      <div className="row-gap">
        <label style={{flex: 1}}>Público<input value={b.audience ?? ''} onChange={(e) => set({audience: e.target.value})} /></label>
        <label style={{flex: 1}}>Tom<input value={b.tone ?? ''} onChange={(e) => set({tone: e.target.value})} /></label>
      </div>
      {b.sections?.length ? (
        <div>
          <span className="eyebrow">Mapa de seções</span>
          <ol className="brief-sections">{b.sections.map((x, i) => <li key={i}><code>{x.fromWord}–{x.toWord}</code> <strong>{x.topic}</strong> <span className="muted">→ {x.intent}</span></li>)}</ol>
        </div>
      ) : null}

      <label>Linguagem visual aprovada
        <textarea rows={6} placeholder="A IA extrai da amostra (paleta, fontes, tipos de cena, densidade, câmera, sons)." value={b.visual ?? ''} onChange={(e) => set({visual: e.target.value})} />
      </label>

      <label>Observações fixas (vale para todas as etapas)
        <textarea rows={3} placeholder="Ex: nunca cobrir o rosto; o nome do produto é sempre 'Método X'; CTA final em amarelo." value={b.notes ?? ''} onChange={(e) => set({notes: e.target.value})} />
      </label>

      {b.blocks?.length ? (
        <div className="brief-view">
          <span className="eyebrow">Roteiro dos blocos do vídeo completo (feitos em paralelo)</span>
          {b.blocks.map((x) => (
            <div key={x.index} className="brief-block">
              <strong className="small">Bloco {x.index} · {fmtSec(x.fromSec)}–{fmtSec(x.toSec)}</strong>
              <label>Foco<textarea rows={2} value={x.focus} onChange={(e) => setBlock(x.index, {focus: e.target.value})} /></label>
              <label>Evitar<input value={x.avoid} onChange={(e) => setBlock(x.index, {avoid: e.target.value})} /></label>
              <label>Emenda com os vizinhos<input value={x.bridge} onChange={(e) => setBlock(x.index, {bridge: e.target.value})} /></label>
            </div>
          ))}
        </div>
      ) : <p className="muted small">O roteiro dos blocos aparece depois da amostra.</p>}

      {err && <p className="error-text">{err}</p>}
      <div className="row-gap">
        <button className="btn btn-primary" disabled={!dirty || running} onClick={save}>Salvar briefing</button>
        {dirty && <button className="btn btn-ghost" onClick={() => { setDraft(d.brief); setDirty(false); }}>Descartar</button>}
        <button className="link" onClick={() => setShowParent((v) => !v)}>{showParent ? 'esconder' : 'ver'} o prompt pai completo</button>
      </div>
      {showParent && <pre className="log brief-parent">{d.parent}</pre>}
    </div>
  );
};
