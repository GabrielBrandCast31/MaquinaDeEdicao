import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {pop} from '../ui/anim';
import {Icon} from '../ui/Icon';
import {Counter, Kinetic, Tag} from '../ui/Type';

/** 300 vs 100.000 seguidores. Starts at output 1302; camera sits on the left until local 183. */
export const S07_Seguidores: React.FC = () => {
  const f = useCurrentFrame();
  const a = Math.min(interpolate(f, [0, 12], [0, 1], clamp), interpolate(f, [80, 90], [1, 0], clamp));
  const b = Math.min(interpolate(f, [86, 98], [0, 1], clamp), interpolate(f, [176, 184], [1, 0], clamp));
  const vendas = pop(f, 130, 30, 9);
  const concl = interpolate(f, [182, 192], [0, 1], {...clamp, easing: ease.out});
  const col: React.CSSProperties = {position: 'absolute', left: 820, top: 0, bottom: 0, width: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center'};
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(270deg, rgba(7,6,12,0.95) 0%, rgba(7,6,12,0.8) 50%, rgba(7,6,12,0) 60%)', opacity: Math.max(a, b)}} />
      <div style={{...col, opacity: a, translate: `${(1 - a) * 80}px 0`}}>
        <Tag at={4}>QUEM TEM</Tag>
        <div style={{display: 'flex', alignItems: 'center', gap: 30, marginTop: 20}}>
          <Icon name="users" size={110} at={10} />
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 220, lineHeight: 1, color: C.white, letterSpacing: '-0.05em'}}><Counter to={300} a={10} b={30} /></div>
        </div>
        <div style={{fontFamily: display, fontWeight: 700, fontSize: 54, color: C.muted, letterSpacing: '0.02em'}}>SEGUIDORES</div>
        <div style={{marginTop: 34, fontFamily: body, fontWeight: 600, fontSize: 36, color: C.violetLight, opacity: interpolate(f, [44, 56], [0, 1], clamp)}}>→ precisa fazer <b style={{color: C.white}}>uma coisa</b></div>
      </div>
      <div style={{...col, opacity: b, translate: `${(1 - b) * 80}px 0`}}>
        <Tag at={86}>QUEM TEM</Tag>
        <div style={{display: 'flex', alignItems: 'center', gap: 30, marginTop: 20}}>
          <Icon name="users" size={110} at={92} color={C.amber} />
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 200, lineHeight: 1, color: C.white, letterSpacing: '-0.05em'}}><Counter from={300} to={100000} a={96} b={118} /></div>
        </div>
        <div style={{fontFamily: display, fontWeight: 700, fontSize: 54, color: C.muted}}>SEGUIDORES</div>
        <svg width="60" height="80" style={{margin: '18px 0 0 40px', opacity: interpolate(f, [122, 130], [0, 1], clamp)}}><path d="M30 0 V70 M8 50 L30 72 L52 50" stroke={C.coral} strokeWidth="6" fill="none" strokeLinecap="round" /></svg>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 24, scale: String(0.6 + vendas * 0.4), opacity: vendas, transformOrigin: 'left center'}}>
          <span style={{fontFamily: display, fontWeight: 800, fontSize: 170, lineHeight: 1, color: C.coral, textShadow: `0 0 60px ${C.coral}66`}}>0</span>
          <span style={{fontFamily: display, fontWeight: 800, fontSize: 64, color: C.coral}}>VENDAS</span>
        </div>
        <div style={{marginTop: 20, fontFamily: mono, fontSize: 24, color: C.muted, letterSpacing: '0.12em', opacity: interpolate(f, [150, 162], [0, 1], clamp)}}>PRECISA DE OUTRA COISA — COMPLETAMENTE DIFERENTE</div>
      </div>
      {concl > 0 ? (
        <AbsoluteFill style={{background: C.bg, opacity: concl, justifyContent: 'center', alignItems: 'center'}}>
          <div style={{position: 'absolute', inset: 0, background: `radial-gradient(40% 50% at 50% 50%, ${C.glow}, transparent)`, opacity: 0.35}} />
          <Kinetic text="MAIS SEGUIDORES" at={184} size={120} stagger={4} />
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 150, color: C.violetLight, lineHeight: 1, scale: String(pop(f, 192, 30, 10)), textShadow: `0 0 50px ${C.glow}`}}>≠</div>
          <Kinetic text="NECESSARIAMENTE MAIS VENDAS" at={196} size={84} stagger={4} color={C.muted} hl={['VENDAS']} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
