import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, display, ease, mono} from '../theme';
import {lerp, rand} from '../ui/anim';
import {Icon, IconName} from '../ui/Icon';
import {Kinetic} from '../ui/Type';

const ITEMS: {t: string; icon: IconName}[] = [
  {t: 'Bio', icon: 'bio'}, {t: 'Feed', icon: 'grid'}, {t: 'Reels', icon: 'play'},
  {t: 'Legendas', icon: 'comment'}, {t: 'Frequência', icon: 'calendar'}, {t: 'Chamada p/ ação', icon: 'target'},
];

/** "...você não sabe por onde começar a colocar as coisas em ordem dentro do seu perfil." Output 1901. Camera on the right. */
export const S10_Ordem: React.FC = () => {
  const f = useCurrentFrame();
  const order = interpolate(f, [90, 112], [0, 1], {...clamp, easing: ease.inOut});
  const o = Math.min(interpolate(f, [0, 12], [0, 1], clamp), interpolate(f, [130, 140], [1, 0], clamp));
  const q = interpolate(f, [44, 56], [0, 1], clamp) * (1 - order);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(7,6,12,0.95) 0%, rgba(7,6,12,0.8) 55%, rgba(7,6,12,0) 64%)'}} />
      <div style={{position: 'absolute', left: 110, top: 90, opacity: q}}>
        <Kinetic text="POR ONDE COMEÇAR?" at={46} size={78} align="left" hl={['COMEÇAR?']} hlColor={C.amber} />
      </div>
      <div style={{position: 'absolute', left: 110, top: 90, opacity: order}}>
        <Kinetic text="TUDO EM ORDEM." at={92} size={78} align="left" hl={['ORDEM.']} hlColor={C.mint} />
      </div>
      {ITEMS.map((it, i) => {
        const cx = 140 + rand(i * 3) * 700, cy = 260 + rand(i * 5 + 1) * 560, cr = (rand(i + 8) - 0.5) * 50;
        const ox = 110, oy = 250 + i * 118;
        const p = interpolate(f, [4 + i * 4, 18 + i * 4], [0, 1], {...clamp, easing: ease.back});
        const drift = (1 - order) * Math.sin((f + i * 30) / 16) * 10;
        const x = lerp(cx, ox, order), y = lerp(cy, oy, order) + drift, r = lerp(cr, 0, order);
        return (
          <div key={it.t} style={{position: 'absolute', left: x, top: y, rotate: `${r}deg`, scale: String(p), opacity: p, width: lerp(320, 860, order), display: 'flex', alignItems: 'center', gap: 20, padding: '18px 24px', borderRadius: 18, background: 'rgba(22,18,38,0.92)', border: `1px solid ${order > 0.5 ? `${C.mint}55` : C.line}`, boxShadow: '0 20px 50px -10px rgba(0,0,0,.7)'}}>
            <div style={{fontFamily: mono, fontWeight: 700, fontSize: 24, color: C.mint, width: lerp(0, 48, order), overflow: 'hidden', opacity: order}}>{`0${i + 1}`}</div>
            <Icon name={it.icon} size={40} at={6 + i * 4} glow={false} />
            <div style={{fontFamily: display, fontWeight: 700, fontSize: 34, color: C.white}}>{it.t}</div>
            <div style={{flex: 1}} />
            <svg width="34" height="34" viewBox="0 0 24 24" style={{opacity: interpolate(f, [104 + i * 3, 110 + i * 3], [0, 1], clamp)}}><path d="M4 12.5l5 5L20 6.5" stroke={C.mint} strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
