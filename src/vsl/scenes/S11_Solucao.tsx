import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, display, ease, mono} from '../theme';
import {rand} from '../ui/anim';
import {Icon, IconName} from '../ui/Icon';
import {Shell} from '../ui/Shell';

export const LiveDot: React.FC<{size?: number}> = ({size = 18}) => {
  const f = useCurrentFrame();
  const ring = (f % 30) / 30;
  return (
    <span style={{position: 'relative', display: 'inline-block', width: size, height: size}}>
      <span style={{position: 'absolute', inset: 0, borderRadius: size, background: '#FF3B4E'}} />
      <span style={{position: 'absolute', inset: -ring * size, borderRadius: size * 3, border: `2px solid rgba(255,59,78,${1 - ring})`}} />
    </span>
  );
};

const CHIPS: {t: string; icon: IconName; at: number}[] = [
  {t: '45 MINUTOS', icon: 'clock', at: 62},
  {t: 'INDIVIDUAL', icon: 'profile', at: 70},
  {t: 'PERSONALIZADO', icon: 'target', at: 78},
];

/** Grande apresentação: ANÁLISE DE PERFIL AO VIVO. Starts at output 2080. */
export const S11_Solucao: React.FC = () => {
  const f = useCurrentFrame();
  const sweep = interpolate(f, [0, 30], [-0.3, 1.3], {...clamp, easing: ease.inOut});
  const t1 = interpolate(f, [2, 22], [0, 1], {...clamp, easing: ease.out});
  const t2 = interpolate(f, [46, 58], [0, 1], {...clamp, easing: ease.back});
  const push = interpolate(f, [0, 106], [1.08, 1], clamp);
  return (
    <Shell bg tin="zoom" tout="zoom" din={10}>
      {new Array(26).fill(0).map((_, i) => {
        const a = rand(i) * Math.PI * 2, d = interpolate(f, [0, 40], [0, 1], {...clamp, easing: ease.out}) * (300 + rand(i + 2) * 700);
        return <div key={i} style={{position: 'absolute', left: 960 + Math.cos(a) * d, top: 470 + Math.sin(a) * d * 0.6, width: 3, height: 3, borderRadius: 3, background: C.violetLight, opacity: 1 - d / 1000, boxShadow: `0 0 12px ${C.violetLight}`}} />;
      })}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', scale: String(push)}}>
        <div style={{fontFamily: mono, fontSize: 26, color: C.muted, letterSpacing: '0.4em', opacity: t1, marginBottom: 20}}>APRESENTANDO</div>
        <div style={{position: 'relative', fontFamily: display, fontWeight: 800, fontSize: 170, lineHeight: 0.95, color: C.white, textAlign: 'center', opacity: t1, filter: `blur(${(1 - t1) * 20}px)`, scale: String(0.92 + t1 * 0.08), letterSpacing: `${-0.05 + (1 - t1) * 0.1}em`}}>
          ANÁLISE DE PERFIL
          <div style={{position: 'absolute', inset: 0, background: `linear-gradient(100deg, transparent ${sweep * 100 - 12}%, rgba(255,255,255,0.85) ${sweep * 100}%, transparent ${sweep * 100 + 12}%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent'}}>ANÁLISE DE PERFIL</div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 34, padding: '18px 40px', borderRadius: 999, background: 'rgba(255,59,78,0.12)', border: '2px solid #FF3B4E', scale: String(t2), opacity: t2}}>
          <LiveDot size={26} />
          <span style={{fontFamily: display, fontWeight: 800, fontSize: 64, color: C.white, letterSpacing: '0.02em'}}>AO VIVO</span>
        </div>
        <div style={{display: 'flex', gap: 22, marginTop: 50}}>
          {CHIPS.map((c) => {
            const p = interpolate(f, [c.at, c.at + 12], [0, 1], {...clamp, easing: ease.out});
            return (
              <div key={c.t} style={{display: 'flex', alignItems: 'center', gap: 14, padding: '16px 28px', borderRadius: 18, background: 'rgba(22,18,38,0.85)', border: `1px solid ${C.line}`, opacity: p, translate: `0 ${(1 - p) * 30}px`}}>
                <Icon name={c.icon} size={34} at={c.at} glow={false} />
                <span style={{fontFamily: mono, fontWeight: 700, fontSize: 28, color: C.white, letterSpacing: '0.1em'}}>{c.t}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Shell>
  );
};
