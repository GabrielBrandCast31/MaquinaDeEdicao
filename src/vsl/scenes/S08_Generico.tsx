import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {rand} from '../ui/anim';
import {Glass} from '../ui/Glass';
import {Icon, IconName} from '../ui/Icon';
import {Kinetic} from '../ui/Type';
import {Shell} from '../ui/Shell';

const PROFILES: {icon: IconName; label: string; x: number; y: number}[] = [
  {icon: 'tooth', label: 'Dentista', x: 250, y: 200},
  {icon: 'briefcase', label: 'Consultor', x: 1500, y: 190},
  {icon: 'video', label: 'Creator', x: 170, y: 560},
  {icon: 'target', label: 'Coach', x: 1580, y: 560},
  {icon: 'users', label: 'Loja local', x: 420, y: 850},
  {icon: 'book', label: 'Professor', x: 1350, y: 860},
];

/** "O curso, por melhor que seja, não sabe qual é o seu caso." Starts at output 1528. */
export const S08_Generico: React.FC = () => {
  const f = useCurrentFrame();
  const ui = interpolate(f, [4, 20], [0, 1], {...clamp, easing: ease.out});
  const gone = interpolate(f, [62, 78], [0, 1], {...clamp, easing: ease.in});
  const glitchX = f > 60 && f < 78 ? (rand(f * 3) - 0.5) * 40 : 0;
  return (
    <Shell bg tin="iris" tout="zoom" din={16}>
      <svg width="1920" height="1080" style={{position: 'absolute', opacity: 1 - gone}}>
        {PROFILES.map((p, i) => {
          const t = interpolate(f, [16 + i * 3, 34 + i * 3], [0, 1], clamp);
          return <path key={i} d={`M${p.x + 60} ${p.y + 60} Q ${(p.x + 960) / 2} ${(p.y + 540) / 2 - 80} 960 540`} stroke={C.line} strokeWidth="2" strokeDasharray="8 10" fill="none" strokeDashoffset={-f * 1.5} opacity={t} />;
        })}
      </svg>
      {PROFILES.map((p, i) => {
        const t = interpolate(f, [12 + i * 3, 26 + i * 3], [0, 1], {...clamp, easing: ease.back});
        return (
          <div key={i} style={{position: 'absolute', left: p.x, top: p.y, scale: String(t * (1 - gone * 0.3)), opacity: t * (1 - gone), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
            <div style={{width: 120, height: 120, borderRadius: 120, background: 'rgba(22,18,38,0.9)', border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'}}>
              <Icon name={p.icon} size={56} at={14 + i * 3} />
              <div style={{position: 'absolute', top: -8, right: -8, width: 40, height: 40, borderRadius: 40, background: C.amber, color: C.bg, fontFamily: display, fontWeight: 800, fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: interpolate(f, [40 + i * 2, 46 + i * 2], [0, 1], clamp)}}>?</div>
            </div>
            <div style={{fontFamily: body, fontWeight: 600, fontSize: 22, color: C.muted}}>{p.label}</div>
          </div>
        );
      })}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{opacity: ui * (1 - gone), scale: String(0.9 + ui * 0.1 - gone * 0.2), translate: `${glitchX}px 0`, filter: `blur(${gone * 20}px)`}}>
          <Glass style={{width: 620, padding: 30}}>
            <div style={{fontFamily: mono, fontSize: 18, color: C.muted, letterSpacing: '0.2em'}}>CURSO · PARA TODOS</div>
            <div style={{height: 250, borderRadius: 18, marginTop: 16, background: 'linear-gradient(135deg, #2c2548, #120f1d)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{width: 90, height: 90, borderRadius: 90, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name="play" size={40} color={C.white} glow={false} /></div>
            </div>
            {['Módulo 1 — Fundamentos', 'Módulo 2 — Conteúdo', 'Módulo 3 — Crescimento'].map((m, i) => (
              <div key={m} style={{display: 'flex', justifyContent: 'space-between', marginTop: 14, padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', fontFamily: body, fontSize: 22, color: C.white}}>
                {m}<span style={{color: C.muted, fontFamily: mono, fontSize: 18}}>{`0${i + 1}`}</span>
              </div>
            ))}
          </Glass>
        </div>
      </AbsoluteFill>
      {f > 70 ? (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <Kinetic text="SEU CASO É" at={74} size={150} stagger={4} />
          <Kinetic text="ESPECÍFICO." at={84} size={180} color={C.violetLight} />
        </AbsoluteFill>
      ) : null}
    </Shell>
  );
};
