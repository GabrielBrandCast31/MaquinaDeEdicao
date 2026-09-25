import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {Icon} from '../ui/Icon';
import {IGProfile} from '../ui/Instagram';
import {Shell} from '../ui/Shell';

const Alert: React.FC<{at: number; text: string; x: number; y: number}> = ({at, text, x, y}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 12], [0, 1], {...clamp, easing: ease.back});
  return (
    <div style={{position: 'absolute', left: x, top: y, scale: String(p), opacity: p, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 14, background: 'rgba(255,90,106,0.14)', border: `1.5px solid ${C.coral}`, fontFamily: mono, fontWeight: 700, fontSize: 19, color: C.coral, letterSpacing: '0.06em', boxShadow: `0 0 30px -6px ${C.coral}`}}>
      <Icon name="alert" size={24} color={C.coral} at={at} glow={false} idle={false} />{text}
    </div>
  );
};

/** Dentista vs consultor. Starts at output 1197. */
export const S06_Nichos: React.FC = () => {
  const f = useCurrentFrame();
  const L = interpolate(f, [8, 26], [0, 1], {...clamp, easing: ease.out});
  const R = interpolate(f, [56, 74], [0, 1], {...clamp, easing: ease.out});
  const mid = interpolate(f, [80, 94], [0, 1], {...clamp, easing: ease.back});
  const card = (p: number, side: -1 | 1): React.CSSProperties => ({opacity: p, translate: `${(1 - p) * 120 * side}px 0`, rotate: `${side * (1 - p) * 6}deg`});
  return (
    <Shell bg tin="whipL" tout="wipe">
      <div style={{position: 'absolute', left: 200, top: 70, ...card(L, -1)}}>
        <div style={{fontFamily: mono, fontSize: 22, color: C.muted, letterSpacing: '0.2em', marginBottom: 14}}>PERFIL 01</div>
        <div style={{scale: '0.7', transformOrigin: '0 0'}}>
          <IGProfile at={8} handle="@dentista" niche="dentista" followers="2.310" bio={['Cirurgiã-dentista', 'Estética do sorriso', 'Agende sua avaliação']} />
        </div>
        <Alert at={34} text="BIO NÃO CONVERTE" x={330} y={230} />
        <Alert at={44} text="POUCO ALCANCE LOCAL" x={300} y={470} />
      </div>
      <div style={{position: 'absolute', right: 200, top: 70, ...card(R, 1)}}>
        <div style={{fontFamily: mono, fontSize: 22, color: C.muted, letterSpacing: '0.2em', marginBottom: 14, textAlign: 'right'}}>PERFIL 02</div>
        <div style={{scale: '0.7', transformOrigin: '100% 0'}}>
          <IGProfile at={56} handle="@consultor" niche="consultor" followers="8.940" bio={['Consultor de negócios', 'Estratégia e gestão', 'Fale comigo']} />
        </div>
        <Alert at={82} text="CONTEÚDO SEM AUTORIDADE" x={-160} y={250} />
        <Alert at={90} text="NÃO GERA CLIENTES" x={-120} y={500} />
      </div>
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70}}>
        <div style={{scale: String(mid), opacity: mid, padding: '22px 44px', borderRadius: 999, background: C.white, color: C.bg, fontFamily: display, fontWeight: 800, fontSize: 46, letterSpacing: '-0.02em', boxShadow: `0 0 80px ${C.glow}`}}>PROBLEMAS DIFERENTES</div>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', pointerEvents: 'none'}}>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 90, color: C.muted, opacity: Math.min(L, R) * 0.9}}>≠</div>
        <div style={{fontFamily: body, fontSize: 20, color: C.muted, opacity: 0}}>.</div>
      </AbsoluteFill>
    </Shell>
  );
};
