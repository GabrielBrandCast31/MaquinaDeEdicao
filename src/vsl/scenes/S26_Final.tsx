import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {pop, rand} from '../ui/anim';
import {Cursor} from '../ui/Cursor';
import {Icon} from '../ui/Icon';
import {Shell} from '../ui/Shell';

/** "se você preferir fazer tudo sozinho" — deliberately quiet. Output 5383 (200 frames), over the camera. */
export const S26_Sozinho: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [8, 30], [0, 1], clamp), interpolate(f, [185, 200], [1, 0], clamp));
  return (
    <div style={{position: 'absolute', left: 110, bottom: 110, opacity: o, fontFamily: mono, fontSize: 26, color: 'rgba(246,244,255,0.5)', letterSpacing: '0.3em', display: 'flex', alignItems: 'center', gap: 16}}>
      <div style={{width: 40, height: 2, background: 'rgba(246,244,255,0.4)'}} /> FAZER SOZINHO
    </div>
  );
};

const CHAIN = [
  {t: 'COMPROU', at: 35},
  {t: 'ASSISTIU', at: 45},
  {t: 'APRENDEU', at: 55},
  {t: 'NÃO APLICOU', at: 74},
];

/** Curso anterior: comprou → assistiu → aprendeu → não aplicou. Output 5585 (98 frames). */
export const S27_Cursos: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Shell bg="neutral" tin="whipL" tout="blur" grid={false}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 110, display: 'flex', justifyContent: 'center', gap: 16, perspective: 1200}}>
        {new Array(9).fill(0).map((_, i) => {
          const p = interpolate(f, [2 + i * 3, 14 + i * 3], [0, 1], {...clamp, easing: ease.back});
          return (
            <div key={i} style={{width: 140, height: 200, borderRadius: 14, background: `linear-gradient(160deg, hsl(${250 + rand(i) * 50} 30% ${22 + rand(i + 1) * 10}%), #0d0b15)`, border: `1px solid ${C.lineSoft}`, opacity: p * 0.9, translate: `0 ${(1 - p) * -80}px`, transform: `rotateY(${(i - 4) * 6}deg)`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 14, filter: `grayscale(${interpolate(f, [74, 86], [0, 0.9], clamp)})`}}>
              <Icon name="book" size={30} color={C.muted} glow={false} idle={false} />
              <div>
                <div style={{height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.18)', width: '80%'}} />
                <div style={{height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.1)', width: '50%', marginTop: 6}} />
                <div style={{fontFamily: mono, fontSize: 12, color: C.coral, marginTop: 10}}>0% APLICADO</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 26}}>
        {CHAIN.map((c, i) => {
          const p = pop(f, c.at, 30, 12);
          const bad = i === 3;
          return (
            <React.Fragment key={c.t}>
              {i > 0 ? <div style={{fontFamily: display, fontSize: 50, color: C.muted, opacity: p}}>→</div> : null}
              <div style={{padding: '22px 34px', borderRadius: 20, background: bad ? 'rgba(255,90,106,0.15)' : 'rgba(22,18,38,0.9)', border: `2px solid ${bad ? C.coral : C.line}`, fontFamily: display, fontWeight: 800, fontSize: bad ? 64 : 46, color: bad ? C.coral : C.white, scale: String(p), opacity: p, boxShadow: bad ? `0 0 60px -10px ${C.coral}` : undefined}}>{c.t}</div>
            </React.Fragment>
          );
        })}
      </div>
    </Shell>
  );
};

/** Sozinho vs alguém olhando → timeline semana 01 vs mês 03. Output 5745 (185 frames). */
export const S28_Timeline: React.FC = () => {
  const f = useCurrentFrame();
  const a = Math.min(interpolate(f, [0, 10], [0, 1], clamp), interpolate(f, [96, 106], [1, 0], clamp));
  const b = interpolate(f, [100, 110], [0, 1], clamp);
  const ter = interpolate(f, [44, 60], [0, 1], {...clamp, easing: ease.out});
  const pts = [{t: 'DIA 01', x: 260}, {t: 'SEMANA 01', x: 700}, {t: 'MÊS 01', x: 1180}, {t: 'MÊS 03', x: 1660}];
  const run = interpolate(f, [106, 150], [260, 1660], {...clamp, easing: ease.inOut});
  const wk = pop(f, 108, 30, 10);
  const m3 = interpolate(f, [144, 156], [0, 1], {...clamp, easing: ease.out});
  return (
    <Shell bg tin="depth" tout="zoom">
      <AbsoluteFill style={{opacity: a, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 70}}>
        <div style={{width: 640, padding: 44, borderRadius: 30, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.lineSoft}`, filter: `grayscale(1) opacity(${1 - ter * 0.5})`, scale: String(1 - ter * 0.08)}}>
          <Icon name="profile" size={70} color={C.muted} glow={false} at={2} />
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 70, color: C.muted, marginTop: 20, letterSpacing: '-0.03em'}}>FAZER SOZINHO</div>
          <div style={{fontFamily: body, fontSize: 26, color: C.muted, marginTop: 10}}>tentativa e erro, no seu tempo</div>
        </div>
        <div style={{fontFamily: display, fontSize: 60, color: C.muted, opacity: ter}}>vs</div>
        <div style={{width: 700, padding: 44, borderRadius: 30, background: 'linear-gradient(160deg, rgba(124,92,255,0.35), rgba(18,14,30,0.95))', border: `1.5px solid ${C.violetLight}`, opacity: ter, scale: String(0.9 + ter * 0.14), boxShadow: `0 0 100px -20px ${C.glow}`}}>
          <div style={{display: 'flex', gap: 10}}><Icon name="expert" size={70} at={44} /><Icon name="analysis" size={70} at={50} /></div>
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 70, lineHeight: 1, color: C.white, marginTop: 20, letterSpacing: '-0.03em'}}>TER ALGUÉM OLHANDO SEU CASO</div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: b}}>
        <div style={{position: 'absolute', top: 170, left: 0, right: 0, textAlign: 'center', fontFamily: display, fontWeight: 800, fontSize: 70, color: C.white, letterSpacing: '-0.03em'}}>
          Na <span style={{color: C.mint}}>primeira semana</span> — não no <span style={{color: C.coral}}>terceiro mês</span>.
        </div>
        <div style={{position: 'absolute', left: 260, width: 1400, top: 560, height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.1)'}} />
        <div style={{position: 'absolute', left: 260, width: run - 260, top: 560, height: 6, borderRadius: 6, background: `linear-gradient(90deg, ${C.mint}, ${C.amber} 55%, ${C.coral})`}} />
        {/* problem piling up after week 1 */}
        <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
          <path d={`M700 552 ${new Array(20).fill(0).map((_, i) => { const x = 700 + i * 50; return x <= run ? `L${x} ${552 - Math.pow(i / 19, 1.6) * 200}` : ''; }).join(' ')}`} stroke={C.coral} strokeWidth="4" fill="none" opacity={0.8} />
        </svg>
        <div style={{position: 'absolute', left: 1400, top: 300, fontFamily: mono, fontSize: 22, color: C.coral, letterSpacing: '0.16em', opacity: m3}}>PROBLEMA ACUMULANDO</div>
        {pts.map((p, i) => {
          const on = run >= p.x - 2;
          const isW = i === 1;
          return (
            <div key={p.t} style={{position: 'absolute', left: p.x - 180, top: 520, width: 360, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <div style={{width: isW ? 86 : 50, height: isW ? 86 : 50, marginTop: isW ? -18 : 0, borderRadius: 90, background: on ? (isW ? C.mint : i === 3 ? C.coral : C.white) : C.bg2, border: `3px solid ${isW ? C.mint : i === 3 ? C.coral : C.muted}`, scale: String(isW ? wk : 1), boxShadow: isW ? `0 0 60px ${C.mint}` : undefined}} />
              <div style={{fontFamily: display, fontWeight: 800, fontSize: isW ? 50 : 36, color: isW ? C.mint : i === 3 ? C.coral : C.muted, marginTop: 24, whiteSpace: 'nowrap'}}>{p.t}</div>
              {isW ? <div style={{fontFamily: mono, fontSize: 20, color: C.mint, marginTop: 6, letterSpacing: '0.16em', opacity: wk}}>AGIR CEDO</div> : null}
            </div>
          );
        })}
      </AbsoluteFill>
    </Shell>
  );
};

/** CTA: botão QUERO MINHA ANÁLISE → clique → escolha horário → agende → comece a aplicar. Output 5930 (318 frames), camera left. */
export const S29_CTA: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, 12], [0, 1], clamp), interpolate(f, [306, 318], [1, 0], clamp));
  const btn = pop(f, 20, 30, 11);
  const press = interpolate(f, [53, 56, 62], [1, 0.93, 1], clamp);
  const clicked = f >= 56;
  const steps = [
    {t: 'ESCOLHA SEU HORÁRIO', at: 104, icon: 'calendar' as const},
    {t: 'AGENDE', at: 122, icon: 'check' as const},
    {t: 'COMECE A APLICAR', at: 243, icon: 'bolt' as const},
  ];
  const shine = ((f * 2) % 160) / 160;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: 'linear-gradient(270deg, rgba(7,6,12,0.96) 0%, rgba(7,6,12,0.85) 52%, rgba(7,6,12,0) 60%)'}} />
      <div style={{position: 'absolute', left: 820, top: 260, width: 1000}}>
        <div style={{fontFamily: mono, fontSize: 24, color: C.muted, letterSpacing: '0.24em', opacity: interpolate(f, [8, 18], [0, 1], clamp)}}>SE EU FOSSE VOCÊ…</div>
        <div style={{position: 'relative', marginTop: 26, padding: '40px 50px', borderRadius: 28, background: clicked ? `linear-gradient(90deg, ${C.mint}, #36c99f)` : `linear-gradient(90deg, ${C.violet}, #5a3fe0)`, fontFamily: display, fontWeight: 800, fontSize: 64, color: clicked ? C.bg : C.white, textAlign: 'center', letterSpacing: '-0.02em', scale: String(btn * press), opacity: btn, boxShadow: `0 30px 100px -20px ${clicked ? 'rgba(77,240,192,0.7)' : C.glow}`, overflow: 'hidden'}}>
          QUERO MINHA ANÁLISE {clicked ? '✓' : '→'}
          <div style={{position: 'absolute', top: 0, bottom: 0, left: `${shine * 160 - 30}%`, width: '20%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', rotate: '20deg'}} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 50}}>
          {steps.map((s, i) => {
            const p = interpolate(f, [s.at, s.at + 14], [0, 1], {...clamp, easing: ease.out});
            const last = i === 2;
            return (
              <div key={s.t} style={{display: 'flex', alignItems: 'center', gap: 24, opacity: p, translate: `${(1 - p) * 50}px 0`}}>
                <div style={{width: 70, height: 70, borderRadius: 20, background: last ? C.mint : 'rgba(124,92,255,0.18)', border: `1.5px solid ${last ? C.mint : C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name={s.icon} size={38} color={last ? C.bg : C.violetLight} at={s.at} glow={false} />
                </div>
                <div style={{fontFamily: mono, fontSize: 22, color: C.muted, width: 40}}>{`0${i + 1}`}</div>
                <div style={{fontFamily: display, fontWeight: 800, fontSize: last ? 62 : 50, color: last ? C.mint : C.white, letterSpacing: '-0.03em'}}>{s.t}</div>
              </div>
            );
          })}
        </div>
      </div>
      <Cursor path={[{f: 30, x: 1700, y: 900}, {f: 50, x: 1400, y: 390}, {f: 70, x: 1400, y: 390}, {f: 90, x: 1760, y: 420}]} clicks={[55]} scale={1.3} />
    </AbsoluteFill>
  );
};

/** Final: Marcão em destaque + botão persistente. Output 6248 → end. */
export const S30_End: React.FC = () => {
  const f = useCurrentFrame();
  const p = interpolate(f, [4, 18], [0, 1], {...clamp, easing: ease.out});
  const fade = interpolate(f, [62, 73], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{boxShadow: `inset 0 0 220px ${C.glow}`, opacity: p * 0.8}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 70, display: 'flex', justifyContent: 'center', opacity: p, translate: `0 ${(1 - p) * 40}px`}}>
        <div style={{padding: '22px 48px', borderRadius: 20, background: `linear-gradient(90deg, ${C.violet}, #5a3fe0)`, fontFamily: display, fontWeight: 800, fontSize: 38, color: C.white, boxShadow: `0 0 60px ${C.glow}`}}>QUERO MINHA ANÁLISE ↓</div>
      </div>
      <AbsoluteFill style={{background: '#000', opacity: fade}} />
    </AbsoluteFill>
  );
};
