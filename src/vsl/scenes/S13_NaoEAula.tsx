import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, display, ease, mono} from '../theme';
import {pop} from '../ui/anim';
import {Backdrop} from '../ui/Backdrop';
import {Icon} from '../ui/Icon';
import {IGProfile} from '../ui/Instagram';
import {Kinetic} from '../ui/Type';
import {LiveDot} from './S11_Solucao';

const w = (f: number, a: number, b: number) => Math.min(interpolate(f, [a, a + 6], [0, 1], clamp), interpolate(f, [b - 5, b], [1, 0], clamp));

/** NÃO É AULA → NADA GRAVADO → É AO VIVO → É O SEU PERFIL. Starts at output 2379 (142 frames). */
export const S13_NaoEAula: React.FC = () => {
  const f = useCurrentFrame();
  const strike = interpolate(f, [10, 18], [0, 1], {...clamp, easing: ease.inOut});
  const gx = interpolate(f, [34, 44], [0, 1], {...clamp, easing: ease.out});
  const live = pop(f, 74, 30, 10);
  const prof = interpolate(f, [92, 110], [0, 1], {...clamp, easing: ease.out});
  return (
    <AbsoluteFill>
      {/* 1. NÃO É AULA — full screen */}
      <AbsoluteFill style={{opacity: w(f, 0, 33)}}>
        <Backdrop grid={false} hue="neutral" particles={0} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{position: 'relative', fontFamily: display, fontWeight: 800, fontSize: 260, letterSpacing: '-0.055em', color: C.white, scale: String(interpolate(f, [0, 33], [1.1, 1], clamp))}}>
            NÃO É AULA.
            <div style={{position: 'absolute', left: '53%', right: '4%', top: '50%', height: 18, background: C.coral, borderRadius: 10, scale: `${strike} 1`, transformOrigin: 'left center', boxShadow: `0 0 30px ${C.coral}`}} />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      {/* 2. NADA GRAVADO — right side (camera left) */}
      <AbsoluteFill style={{opacity: w(f, 33, 73)}}>
        <AbsoluteFill style={{background: 'linear-gradient(270deg, rgba(7,6,12,0.95) 0%, rgba(7,6,12,0.8) 50%, rgba(7,6,12,0) 60%)'}} />
        <div style={{position: 'absolute', left: 860, top: 300, display: 'flex', flexDirection: 'column', gap: 30, translate: `${(1 - gx) * 80}px 0`}}>
          <div style={{width: 520, height: 300, borderRadius: 24, background: 'linear-gradient(135deg,#2a2440,#100d1a)', border: `1px solid ${C.lineSoft}`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'saturate(0.3)'}}>
            <Icon name="play" size={80} color={C.muted} glow={false} at={34} />
            <div style={{position: 'absolute', left: 20, top: 18, fontFamily: mono, fontSize: 20, color: C.muted}}>▶ AULA GRAVADA</div>
            <svg width="520" height="300" style={{position: 'absolute', inset: 0}}><path d="M40 40 L480 260 M480 40 L40 260" stroke={C.coral} strokeWidth="10" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - interpolate(f, [42, 54], [0, 1], clamp)} /></svg>
          </div>
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 96, color: C.white, letterSpacing: '-0.04em'}}>NADA GRAVADO.</div>
        </div>
      </AbsoluteFill>
      {/* 3. É AO VIVO — left side (camera right) */}
      <AbsoluteFill style={{opacity: w(f, 73, 92)}}>
        <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(40,4,12,0.9) 0%, rgba(7,6,12,0.7) 55%, rgba(7,6,12,0) 64%)'}} />
        <div style={{position: 'absolute', left: 110, top: 360, scale: String(live), transformOrigin: 'left center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
            <LiveDot size={60} />
            <div style={{fontFamily: display, fontWeight: 800, fontSize: 170, color: C.white, letterSpacing: '-0.05em', lineHeight: 1}}>É AO VIVO.</div>
          </div>
        </div>
      </AbsoluteFill>
      {/* 4. É O SEU PERFIL — camera left, profile in 3D on the right */}
      <AbsoluteFill style={{opacity: w(f, 92, 142)}}>
        <AbsoluteFill style={{background: 'linear-gradient(270deg, rgba(7,6,12,0.95) 0%, rgba(7,6,12,0.8) 50%, rgba(7,6,12,0) 60%)'}} />
        <div style={{position: 'absolute', left: 820, top: 150}}>
          <Kinetic text="É O SEU PERFIL." at={92} size={100} align="left" hl={['PERFIL.']} />
          <div style={{fontFamily: mono, fontSize: 24, color: C.violetLight, letterSpacing: '0.2em', marginTop: 16, opacity: interpolate(f, [110, 120], [0, 1], clamp)}}>NA TELA · EM TEMPO REAL</div>
        </div>
        <div style={{position: 'absolute', left: 1160, top: 380, transform: `perspective(1400px) rotateY(${-24 + prof * 8}deg) rotateX(8deg)`, opacity: prof, translate: `${(1 - prof) * 200}px ${(1 - prof) * 100}px`}}>
          <div style={{scale: '0.78', transformOrigin: 'top left'}}><IGProfile at={96} /></div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
