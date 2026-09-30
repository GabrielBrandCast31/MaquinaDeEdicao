import {Player, type PlayerRef} from '@remotion/player';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {LabEdit} from '../../src/lab/LabEdit';
import {SFX_CATEGORIES, SFX_LIBRARY, type SfxCategory} from '../../src/lab/sfx';
import type {LabProps} from '../../src/lab/types';
import {api, type Library} from './api';
import {Tabs} from './components';
import {buildDemoSpec, DEMO_FPS, DEMO_FRAMES, DEMO_GROUPS, DEMOS, type DemoAspect} from './fxDemos';
import {playSfx, useSfxPlaying} from './sound';

type Tab = 'sfx' | 'fx';

const readPref = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const writePref = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Browsable catalog of every sound and visual effect the Lab can use. */
export const LibraryView: React.FC = () => {
  const [lib, setLib] = useState<Library | null>(null);
  const [err, setErr] = useState('');
  const [tab, setTabRaw] = useState<Tab>(() => (readPref('lab.libTab', 'sfx') === 'fx' ? 'fx' : 'sfx'));
  const setTab = (t: Tab) => { setTabRaw(t); writePref('lab.libTab', t); };
  useEffect(() => { api.get<Library>('/api/library').then(setLib, (e) => setErr((e as Error).message)); }, []);

  return (
    <div className="main-pad">
      <header className="page-head">
        <div>
          <span className="eyebrow">Biblioteca</span>
          <h1 className="page-title">Efeitos</h1>
        </div>
        <div className="lib-tabs">
          <Tabs<Tab> tabs={[['sfx', `Sonoros (${SFX_LIBRARY.length})`], ['fx', `Visuais (${DEMOS.length})`]]} value={tab} onChange={setTab} />
        </div>
      </header>
      {err && <p className="error-text">{err}</p>}
      {tab === 'sfx' ? <SfxLibrary lib={lib} /> : <FxLibrary lib={lib} />}
    </div>
  );
};

// ---------- sound effects ----------
const SfxLibrary: React.FC<{lib: Library | null}> = ({lib}) => {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<SfxCategory | 'all'>('all');
  const [copied, setCopied] = useState('');
  const playing = useSfxPlaying();
  const match = (s: (typeof SFX_LIBRARY)[number]) => (cat === 'all' || s.cat === cat) && (!q || norm(`${s.name} ${s.label} ${s.hint}`).includes(norm(q)));
  const shown = SFX_LIBRARY.filter(match);
  const copy = async (name: string) => {
    try { await navigator.clipboard.writeText(name); setCopied(name); setTimeout(() => setCopied((c) => (c === name ? '' : c)), 1400); } catch { /* clipboard blocked */ }
  };

  return (
    <div>
      <p className="muted lib-intro">
        Clique para ouvir. Para usar, escolha em <strong>Ajustes → Áudio</strong> (efeito automático nos cortes, punches e destaques) ou peça no chat do projeto, por exemplo <em>"coloca o som <code>cash</code> quando eu falar de faturamento"</em>. A IA já conhece o catálogo inteiro e escolhe sozinha no plano e no motion.
      </p>
      <div className="lib-toolbar">
        <input className="lib-search" placeholder="Buscar: dinheiro, impacto, clique…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          <button className={`chip ${cat === 'all' ? 'chip-on' : ''}`} onClick={() => setCat('all')}>Todas</button>
          {SFX_CATEGORIES.map((c) => <button key={c.id} className={`chip ${cat === c.id ? 'chip-on' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>)}
        </div>
      </div>
      {shown.length === 0 && <p className="muted">Nenhum efeito com “{q}”.</p>}
      {SFX_CATEGORIES.map((c) => {
        const items = shown.filter((s) => s.cat === c.id);
        if (!items.length) return null;
        return (
          <section key={c.id} className="lib-sec">
            <h3 className="h3">{c.label} <span className="muted small">· {c.hint}</span></h3>
            <div className="sfx-grid">
              {items.map((s) => {
                const info = lib?.sfx[s.name];
                const on = playing.name === s.name;
                return (
                  <div key={s.name} className={`sfx-card ${on ? 'sfx-on' : ''} ${info === null ? 'sfx-missing' : ''}`}>
                    <button className="sfx-play" onClick={() => playSfx(s.name)} aria-label={`Ouvir ${s.label}`} title={s.hint}>
                      <Wave peaks={info?.peaks ?? []} t={on ? playing.t : -1} />
                      <span className="sfx-icon" aria-hidden>{on ? '■' : '▶'}</span>
                    </button>
                    <div className="sfx-body">
                      <div className="sfx-title"><strong>{s.label}</strong><span className="muted mono small">{info ? `${info.sec.toFixed(1)}s` : info === null ? 'sem arquivo' : ''}</span></div>
                      <span className="muted small">{s.hint}</span>
                      <button className="sfx-name mono" title="Copiar o nome (para usar no chat ou no código)" onClick={() => copy(s.name)}>{copied === s.name ? 'copiado ✓' : s.name}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const Wave: React.FC<{peaks: number[]; t: number}> = ({peaks, t}) => {
  const n = Math.max(1, peaks.length);
  const max = Math.max(0.05, ...peaks);
  return (
    <svg className="wave" viewBox={`0 0 ${n * 3} 40`} preserveAspectRatio="none" aria-hidden>
      {peaks.map((p, i) => {
        const h = Math.max(1.5, (p / max) * 36);
        return <rect key={i} x={i * 3} y={20 - h / 2} width={2} height={h} rx={1} className={t >= 0 && i / n <= t ? 'wave-on' : ''} />;
      })}
    </svg>
  );
};

// ---------- visual effects ----------
const FxLibrary: React.FC<{lib: Library | null}> = ({lib}) => {
  const [sel, setSelRaw] = useState(() => readPref('lab.fx', DEMOS[0].id));
  const [aspect, setAspectRaw] = useState<DemoAspect>(() => (readPref('lab.fxAspect', '9:16') === '16:9' ? '16:9' : '9:16'));
  const player = useRef<PlayerRef>(null);
  const demo = DEMOS.find((d) => d.id === sel) ?? DEMOS[0];
  const setSel = (id: string) => {
    setSelRaw(id); writePref('lab.fx', id);
    // Clicking is a user gesture, so playback with sound is allowed to start here.
    player.current?.seekTo(0);
    player.current?.play();
  };
  const setAspect = (a: DemoAspect) => { setAspectRaw(a); writePref('lab.fxAspect', a); };
  const inputProps = useMemo<LabProps | null>(
    () => (lib?.footage ? {spec: buildDemoSpec(demo, lib.baseStyle, lib.footage, aspect), base: '', scenes: demo.scenes ?? []} : null),
    [lib, demo, aspect],
  );
  if (!lib) return <p className="muted">Carregando…</p>;
  if (!lib.footage || !inputProps?.spec) return <p className="muted">Crie um projeto e envie um vídeo bruto: as demonstrações usam esse vídeo para mostrar cada efeito.</p>;
  const {width, height} = inputProps.spec;

  return (
    <div className="fx-layout">
      <nav className="fx-list">
        {DEMO_GROUPS.map((g) => (
          <section key={g}>
            <span className="eyebrow">{g}</span>
            <div className="fx-items">
              {DEMOS.filter((d) => d.group === g).map((d) => (
                <button key={d.id} className={`fx-item ${d.id === demo.id ? 'fx-on' : ''}`} onClick={() => setSel(d.id)}>{d.title}</button>
              ))}
            </div>
          </section>
        ))}
      </nav>
      <div className="fx-stage">
        <div className="fx-player" style={{aspectRatio: `${width} / ${height}`, width: aspect === '9:16' ? 'min(100%, calc(70vh * 9 / 16))' : '100%'}}>
          <Player
            ref={player}
            component={LabEdit}
            inputProps={inputProps}
            durationInFrames={DEMO_FRAMES}
            fps={DEMO_FPS}
            compositionWidth={width}
            compositionHeight={height}
            style={{width: '100%', height: '100%'}}
            controls
            loop
            clickToPlay
            acknowledgeRemotionLicense
          />
        </div>
        <div className="fx-info">
          <div className="row-gap fx-info-head">
            <span className="eyebrow">{demo.group}</span>
            <div className="seg">
              {(['9:16', '16:9'] as const).map((a) => <button key={a} className={aspect === a ? 'seg-on' : ''} onClick={() => setAspect(a)}>{a}</button>)}
            </div>
          </div>
          <h3 className="h3 fx-title">{demo.title}</h3>
          <p className="muted">{demo.desc}</p>
          <p className="small fx-where"><span className="eyebrow">Onde ativar</span>{demo.where}</p>
          <p className="muted small">Demonstração com {lib.footage.name}. Liga o som do player para ouvir os efeitos sonoros que acompanham.</p>
        </div>
      </div>
    </div>
  );
};
