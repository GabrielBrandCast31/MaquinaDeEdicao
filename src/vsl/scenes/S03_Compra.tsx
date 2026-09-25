import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {rand} from '../ui/anim';
import {Glass} from '../ui/Glass';
import {Icon} from '../ui/Icon';
import {Shell} from '../ui/Shell';

const Row: React.FC<{at: number; icon: 'check' | 'lock' | 'play'; title: string; sub: string; color: string}> = ({at, icon, title, sub, color}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 16], [0, 1], {...clamp, easing: ease.out});
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 26, padding: '26px 30px', borderRadius: 22, background: `linear-gradient(90deg, ${color}1f, rgba(255,255,255,0.02))`, border: `1px solid ${color}40`, opacity: p, translate: `${(1 - p) * -60}px 0`, clipPath: `inset(0 ${(1 - p) * 100}% 0 0 round 22px)`}}>
      <div style={{width: 76, height: 76, borderRadius: 76, background: `${color}22`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon name={icon} size={40} color={color} at={at + 4} stroke={2.4} />
      </div>
      <div>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 44, color: C.white, letterSpacing: '-0.02em'}}>{title}</div>
        <div style={{fontFamily: body, fontSize: 22, color: C.muted}}>{sub}</div>
      </div>
    </div>
  );
};

/** Compra confirmada → acesso liberado → aula 01. Starts at output 352 (camera on the right). */
export const S03_Compra: React.FC = () => {
  const f = useCurrentFrame();
  const ring = interpolate(f, [4, 30], [0, 1], {...clamp, easing: ease.out});
  return (
    <Shell tin="whipR" tout="blur">
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(7,6,12,0.92) 0%, rgba(7,6,12,0.75) 55%, rgba(7,6,12,0) 64%)'}} />
      <div style={{position: 'absolute', left: 110, top: 110, width: 960}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: mono, fontSize: 22, color: C.muted, letterSpacing: '0.16em'}}>
          <div style={{width: 12, height: 12, borderRadius: 12, background: C.mint, boxShadow: `0 0 14px ${C.mint}`}} /> PAINEL DO ALUNO
        </div>
        <Glass style={{marginTop: 26, padding: 40, position: 'relative', overflow: 'hidden'}} glow="rgba(77,240,192,0.25)">
          <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
            <svg width="150" height="150" viewBox="0 0 150 150" style={{overflow: 'visible'}}>
              <circle cx="75" cy="75" r="64" stroke={`${C.mint}33`} strokeWidth="8" fill="none" />
              <circle cx="75" cy="75" r="64" stroke={C.mint} strokeWidth="8" fill="none" strokeDasharray={402} strokeDashoffset={402 * (1 - ring)} transform="rotate(-90 75 75)" strokeLinecap="round" style={{filter: `drop-shadow(0 0 16px ${C.mint})`}} />
              <path d="M48 77 L67 96 L104 57" stroke={C.mint} strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={interpolate(f, [22, 38], [1, 0], {...clamp, easing: ease.out})} />
              {new Array(14).fill(0).map((_, i) => {
                const a = (i / 14) * Math.PI * 2, t = interpolate(f, [30, 60], [0, 1], {...clamp, easing: ease.out});
                return <circle key={i} cx={75 + Math.cos(a) * (70 + t * (50 + rand(i) * 40))} cy={75 + Math.sin(a) * (70 + t * (50 + rand(i) * 40))} r={3 + rand(i + 1) * 3} fill={i % 2 ? C.mint : C.violetLight} opacity={t > 0 && t < 1 ? 1 - t : 0} />;
              })}
            </svg>
            <div>
              <div style={{fontFamily: display, fontWeight: 800, fontSize: 76, lineHeight: 1, color: C.white, letterSpacing: '-0.035em', opacity: interpolate(f, [18, 32], [0, 1], clamp)}}>COMPRA<br /><span style={{color: C.mint}}>CONFIRMADA</span></div>
            </div>
          </div>
        </Glass>
        <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 24}}>
          <Row at={88} icon="check" title="ACESSO LIBERADO" sub="enviado para o seu e-mail" color={C.violetLight} />
          <Row at={172} icon="play" title="AULA 01 DISPONÍVEL" sub="comece hoje mesmo" color={C.amber} />
        </div>
      </div>
    </Shell>
  );
};
