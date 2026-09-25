import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, display, ease, mono} from '../theme';
import {Icon, IconName} from '../ui/Icon';
import {Counter, Tag} from '../ui/Type';

const ITEMS: {t: string; at: number; icon: IconName}[] = [
  {t: 'O QUE CORRIGIR NA BIO', at: 70, icon: 'bio'},
  {t: 'QUAL FORMATO FUNCIONA', at: 111, icon: 'video'},
  {t: 'O QUE ESTÁ MATANDO SUA RETENÇÃO', at: 190, icon: 'retention'},
  {t: 'O QUE POSTAR NOS PRÓXIMOS 30 DIAS', at: 272, icon: 'calendar'},
];

/** Resultado da call — checklist sincronizado. Starts at output 3445 (camera on the left). */
export const S18_Checklist: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, 12], [0, 1], clamp), interpolate(f, [348, 359], [1, 0], clamp));
  const head2 = interpolate(f, [44, 58], [0, 1], {...clamp, easing: ease.out});
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: 'linear-gradient(270deg, rgba(7,6,12,0.96) 0%, rgba(7,6,12,0.85) 52%, rgba(7,6,12,0) 60%)'}} />
      <div style={{position: 'absolute', left: 820, top: 110, width: 1000}}>
        <Tag at={4}>NO FIM DOS <Counter to={45} a={8} b={30} /> MINUTOS</Tag>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 84, color: C.white, letterSpacing: '-0.04em', marginTop: 22, opacity: head2, translate: `0 ${(1 - head2) * 30}px`}}>VOCÊ SAI SABENDO:</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 20, marginTop: 36}}>
          {ITEMS.map((it) => {
            const p = interpolate(f, [it.at, it.at + 14], [0, 1], {...clamp, easing: ease.out});
            const ck = interpolate(f, [it.at + 6, it.at + 18], [0, 1], {...clamp, easing: ease.out});
            const current = f >= it.at && f < it.at + 60;
            return (
              <div key={it.t} style={{display: 'flex', alignItems: 'center', gap: 24, padding: '24px 28px', borderRadius: 22, background: current ? 'linear-gradient(90deg, rgba(77,240,192,0.16), rgba(255,255,255,0.03))' : 'rgba(22,18,38,0.8)', border: `1.5px solid ${current ? `${C.mint}88` : C.line}`, opacity: 0.15 + p * 0.85, translate: `${(1 - p) * 60}px 0`, scale: String(current ? 1.02 : 1), transformOrigin: 'left center'}}>
                <div style={{width: 60, height: 60, borderRadius: 16, background: ck > 0 ? C.mint : 'transparent', border: `2px solid ${C.mint}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg width="36" height="36" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" stroke={C.bg} strokeWidth="3.4" fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ck} /></svg>
                </div>
                <div style={{fontFamily: display, fontWeight: 800, fontSize: 35, color: C.white, letterSpacing: '-0.02em', flex: 1, whiteSpace: 'nowrap'}}>{it.t}</div>
                <Icon name={it.icon} size={40} at={it.at + 4} glow={false} />
              </div>
            );
          })}
        </div>
        <div style={{fontFamily: mono, fontSize: 22, color: C.muted, letterSpacing: '0.2em', marginTop: 26, opacity: interpolate(f, [300, 312], [0, 1], clamp)}}>PLANO PARA OS PRÓXIMOS 30 DIAS</div>
      </div>
    </AbsoluteFill>
  );
};
