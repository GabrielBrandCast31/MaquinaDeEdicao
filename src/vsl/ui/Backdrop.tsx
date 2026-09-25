import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {rand} from './anim';

/** Dark premium stage: gradient, perspective grid, glow orbs and drifting particles. */
export const Backdrop: React.FC<{hue?: 'violet' | 'mint' | 'coral' | 'neutral'; grid?: boolean; particles?: number; intensity?: number}> = ({
  hue = 'violet', grid = true, particles = 40, intensity = 1,
}) => {
  const f = useCurrentFrame();
  const col = hue === 'mint' ? 'rgba(77,240,192,0.35)' : hue === 'coral' ? 'rgba(255,90,106,0.32)' : hue === 'neutral' ? 'rgba(255,255,255,0.08)' : C.glow;
  return (
    <AbsoluteFill style={{background: `radial-gradient(120% 90% at 50% 110%, ${C.bg2} 0%, ${C.bg} 60%)`, overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: 1100, height: 1100, borderRadius: '50%', left: 960 - 550 + Math.sin(f / 70) * 160, top: -520 + Math.cos(f / 90) * 60, background: `radial-gradient(circle, ${col} 0%, transparent 62%)`, opacity: 0.55 * intensity, filter: 'blur(40px)'}} />
      <div style={{position: 'absolute', width: 900, height: 900, borderRadius: '50%', left: 1400 + Math.cos(f / 80) * 120, top: 520 + Math.sin(f / 60) * 80, background: `radial-gradient(circle, rgba(92,120,255,0.35) 0%, transparent 60%)`, opacity: 0.5 * intensity, filter: 'blur(50px)'}} />
      {grid ? (
        <div style={{position: 'absolute', left: -600, right: -600, bottom: -260, height: 700, transform: 'perspective(700px) rotateX(62deg)', backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`, backgroundSize: '80px 80px', backgroundPosition: `0px ${(f * 1.2) % 80}px`, maskImage: 'linear-gradient(to top, black 10%, transparent 85%)', WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 85%)', opacity: 0.55}} />
      ) : null}
      {new Array(particles).fill(0).map((_, i) => {
        const x = rand(i) * 1920, sp = 0.2 + rand(i + 9) * 0.6, y = (rand(i + 3) * 1200 - f * sp) % 1200;
        const s = 1.5 + rand(i + 5) * 3;
        return <div key={i} style={{position: 'absolute', left: x + Math.sin((f + i * 20) / 40) * 12, top: y < 0 ? y + 1200 : y, width: s, height: s, borderRadius: s, background: C.violetLight, opacity: 0.15 + rand(i + 7) * 0.45, boxShadow: `0 0 ${s * 4}px ${C.violetLight}`}} />;
      })}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)'}} />
    </AbsoluteFill>
  );
};

/** Film grain + light vignette used on top of everything. */
export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.09}}>
      <svg width="1920" height="1080">
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 12} /></filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};
