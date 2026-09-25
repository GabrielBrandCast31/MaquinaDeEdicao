import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, display, ease, mono} from '../theme';
import {pop} from '../ui/anim';
import {Tag} from '../ui/Type';

/** "Antes de você fechar essa página, me dá 3 minutos." — local frame 0 = output 0 */
export const S01_Open: React.FC = () => {
  const f = useCurrentFrame();
  const three = pop(f, 64, 30, 9, 0.7);
  const out = interpolate(f, [128, 140], [1, 0], {...clamp, easing: ease.in});
  const meDa = interpolate(f, [50, 62], [0, 1], {...clamp, easing: ease.out});
  const min = interpolate(f, [70, 82], [0, 1], {...clamp, easing: ease.out});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <AbsoluteFill style={{background: 'linear-gradient(270deg, rgba(7,6,12,0.75) 0%, rgba(7,6,12,0.35) 30%, rgba(7,6,12,0) 45%)', opacity: interpolate(f, [0, 20], [0, 1], clamp)}} />
      <div style={{position: 'absolute', right: 110, top: 150, width: 640, display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
        <Tag at={8}>ANTES DE FECHAR ESTA PÁGINA</Tag>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 96, color: C.white, letterSpacing: '-0.04em', marginTop: 36, opacity: meDa, translate: `${(1 - meDa) * 60}px 0`, textShadow: '0 10px 40px rgba(0,0,0,.6)'}}>ME DÁ</div>
        <div style={{position: 'relative', height: 420, marginTop: -30}}>
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 520, lineHeight: 0.85, color: C.white, scale: String(0.2 + three * 0.8), rotate: `${(1 - three) * -18}deg`, opacity: Math.min(1, three * 2), backgroundImage: `linear-gradient(180deg, #fff 30%, ${C.violetLight})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 0 60px ${C.glow})`}}>3</div>
        </div>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 110, color: C.white, letterSpacing: '-0.04em', marginTop: -20, clipPath: `inset(0 ${(1 - min) * 100}% 0 0)`, textShadow: '0 10px 40px rgba(0,0,0,.6)'}}>MINUTOS.</div>
      </div>
    </AbsoluteFill>
  );
};

/** Countdown chip born from the "3", then docked top-left as HUD. Absolute frames: shows 64 → 700. */
export const TimerHud: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 64 || f > 700) return null;
  const secs = Math.max(0, 180 - Math.floor((f - 64) / 30));
  const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
  const dock = interpolate(f, [118, 140], [0, 1], {...clamp, easing: ease.inOut});
  const o = Math.min(interpolate(f, [64, 74], [0, 1], clamp), interpolate(f, [680, 700], [1, 0], clamp));
  return (
    <div style={{position: 'absolute', left: interpolate(dock, [0, 1], [110, 70]), top: interpolate(dock, [0, 1], [820, 60]), scale: String(interpolate(dock, [0, 1], [1.5, 0.8])), transformOrigin: '0 0', opacity: o, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 26px', borderRadius: 18, background: 'rgba(12,10,22,0.72)', border: `1px solid ${C.line}`, boxShadow: `0 0 40px -10px ${C.glow}`, zIndex: 40}}>
      <svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" stroke={C.lineSoft} strokeWidth="3" fill="none" /><circle cx="15" cy="15" r="12" stroke={C.violetLight} strokeWidth="3" fill="none" strokeDasharray={75.4} strokeDashoffset={75.4 * (1 - secs / 180)} transform="rotate(-90 15 15)" strokeLinecap="round" /></svg>
      <span style={{fontFamily: mono, fontWeight: 700, fontSize: 40, color: C.white, letterSpacing: '0.04em'}}>{mm}:{ss}</span>
    </div>
  );
};
