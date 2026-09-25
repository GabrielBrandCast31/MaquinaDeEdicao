import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {Icon, IconName} from '../ui/Icon';
import {Kinetic} from '../ui/Type';
import {Shell} from '../ui/Shell';

const CARDS: {n: string; at: number; icon: IconName; label: string}[] = [
  {n: '01', at: 22, icon: 'bio', label: 'Mudança'},
  {n: '02', at: 32, icon: 'grid', label: 'Mudança'},
  {n: '03', at: 42, icon: 'play', label: 'Mudança'},
];

/** Três mudanças → não é genérico → feitas para você. Starts at output 2780. */
export const S15_Mudancas: React.FC = () => {
  const f = useCurrentFrame();
  const lift = interpolate(f, [150, 176], [0, 1], {...clamp, easing: ease.inOut});
  const gen = interpolate(f, [112, 120], [0, 1], clamp);
  const genOut = interpolate(f, [140, 150], [1, 0], clamp);
  const strike = interpolate(f, [124, 132], [0, 1], {...clamp, easing: ease.inOut});
  return (
    <Shell bg tin="whipR" tout="blur">
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 90}}>
        <Kinetic text="3 MUDANÇAS" at={20} size={96} hl={['3']} />
        <div style={{fontFamily: mono, fontSize: 26, color: C.muted, letterSpacing: '0.24em', marginTop: 14, opacity: interpolate(f, [80, 92], [0, 1], clamp)}}>QUE FAZEM A DIFERENÇA NO SEU CASO</div>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', perspective: 1600, translate: `0 ${60 - lift * 40}px`}}>
        <div style={{display: 'flex', gap: 50, transformStyle: 'preserve-3d'}}>
          {CARDS.map((c, i) => {
            const p = interpolate(f, [c.at, c.at + 22], [0, 1], {...clamp, easing: ease.out});
            const idle = Math.sin((f + i * 20) / 22) * 5;
            return (
              <div key={c.n} style={{width: 380, height: 460, borderRadius: 34, padding: 36, background: `linear-gradient(160deg, rgba(124,92,255,${0.3 + lift * 0.2}), rgba(18,14,30,0.95) 60%)`, border: `1.5px solid ${lift > 0.5 ? C.mint : C.line}`, boxShadow: `0 50px 100px -30px rgba(0,0,0,0.9), 0 0 ${lift * 60}px -10px ${C.mint}`, transform: `rotateY(${(1 - p) * 70 + (i - 1) * -8 + idle * 0.4}deg) rotateX(${8 - idle * 0.3}deg) translateZ(${(1 - p) * -400}px)`, opacity: p, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Icon name={c.icon} size={60} at={c.at + 8} />
                  <div style={{fontFamily: mono, fontSize: 20, color: C.muted, letterSpacing: '0.2em'}}>{c.label.toUpperCase()}</div>
                </div>
                <div style={{fontFamily: display, fontWeight: 800, fontSize: 200, lineHeight: 0.8, color: C.white, letterSpacing: '-0.06em'}}>{c.n}</div>
                <div style={{display: 'flex', alignItems: 'center', gap: 12, fontFamily: body, fontWeight: 600, fontSize: 24, color: lift > 0.5 ? C.mint : C.muted}}>
                  <Icon name={lift > 0.5 ? 'check' : 'target'} size={28} color={lift > 0.5 ? C.mint : C.muted} glow={false} idle={false} />
                  {lift > 0.5 ? 'Para o seu perfil' : 'Para o seu caso'}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70, opacity: gen * genOut}}>
        <div style={{position: 'relative', fontFamily: display, fontWeight: 800, fontSize: 64, color: C.muted, padding: '10px 30px'}}>
          CASO GENÉRICO
          <div style={{position: 'absolute', left: 0, top: '50%', height: 8, width: `${strike * 100}%`, background: C.coral, borderRadius: 6}} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 60}}>
        {f > 150 ? <Kinetic text="FEITAS PARA VOCÊ." at={172} size={84} hl={['VOCÊ.']} hlColor={C.mint} /> : null}
      </AbsoluteFill>
    </Shell>
  );
};
