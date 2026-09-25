import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, display, ease, mono} from '../theme';

/** Kinetic headline: each word rises out of a mask with blur. `hl` words are painted in accent. */
export const Kinetic: React.FC<{
  text: string; at?: number; stagger?: number; size?: number; color?: string; hl?: string[]; hlColor?: string;
  weight?: number; align?: 'left' | 'center' | 'right'; out?: number; style?: React.CSSProperties; tracking?: number; lineHeight?: number;
}> = ({text, at = 0, stagger = 3, size = 110, color = C.white, hl = [], hlColor = C.violetLight, weight = 800, align = 'center', out, style, tracking = -0.035, lineHeight = 1.02}) => {
  const f = useCurrentFrame();
  const words = text.split(' ');
  return (
    <div style={{fontFamily: display, fontWeight: weight, fontSize: size, lineHeight, letterSpacing: `${tracking}em`, color, textAlign: align, display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', columnGap: size * 0.26, ...style}}>
      {words.map((w, i) => {
        const s = at + i * stagger;
        const p = interpolate(f, [s, s + 16], [0, 1], {...clamp, easing: ease.out});
        const o = out === undefined ? 1 : interpolate(f, [out + i * 1.5, out + i * 1.5 + 10], [1, 0], {...clamp, easing: ease.in});
        const isHl = hl.includes(w.replace(/[.,!?]/g, ''));
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.08, marginBottom: -size * 0.08}}>
            <span style={{display: 'inline-block', translate: `0 ${(1 - p) * 105 + (1 - o) * -60}%`, opacity: Math.min(p * 1.4, o), filter: `blur(${(1 - p) * 10 + (1 - o) * 8}px)`, color: isHl ? hlColor : undefined, textShadow: isHl ? `0 0 40px ${hlColor}66` : undefined}}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Small mono label chip, e.g. "PASSO 01". */
export const Tag: React.FC<{children: React.ReactNode; color?: string; at?: number; style?: React.CSSProperties}> = ({children, color = C.violetLight, at = 0, style}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 14], [0, 1], {...clamp, easing: ease.out});
  return (
    <div style={{display: 'inline-flex', width: 'fit-content', alignItems: 'center', gap: 10, fontFamily: mono, fontWeight: 700, fontSize: 22, letterSpacing: '0.18em', color, padding: '10px 18px', border: `1px solid ${color}55`, borderRadius: 999, background: `${color}14`, opacity: p, translate: `${(1 - p) * -20}px 0`, clipPath: `inset(0 ${(1 - p) * 100}% 0 0 round 999px)`, ...style}}>
      <span style={{width: 8, height: 8, borderRadius: 8, background: color, boxShadow: `0 0 12px ${color}`}} />
      {children}
    </div>
  );
};

/** Number that counts from `from` to `to` between frames a and b. */
export const Counter: React.FC<{from?: number; to: number; a: number; b: number; prefix?: string; suffix?: string; style?: React.CSSProperties}> = ({from = 0, to, a, b, prefix = '', suffix = '', style}) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [a, b], [from, to], {...clamp, easing: ease.out});
  return <span style={{fontVariantNumeric: 'tabular-nums', ...style}}>{prefix}{Math.round(v).toLocaleString('pt-BR')}{suffix}</span>;
};
