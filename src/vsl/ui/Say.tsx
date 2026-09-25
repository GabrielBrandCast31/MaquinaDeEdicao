import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {WORDS} from '../data/words';
import {C, clamp, display, ease} from '../theme';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9$]/g, '');

/**
 * Smart kinetic caption: shows the spoken words between absolute frames `a` and `b`,
 * each word popping in exactly when it's said. Only key words (`hl`) get the accent.
 * Must be rendered at the root timeline (absolute frames).
 */
export const Say: React.FC<{a: number; b: number; hl?: string[]; pos?: 'bottom' | 'center' | 'top' | 'left'; size?: number; upper?: boolean; hlColor?: string}> = ({a, b, hl = [], pos = 'bottom', size = 64, upper = true, hlColor = C.violetLight}) => {
  const f = useCurrentFrame();
  if (f < a - 2 || f > b + 12) return null;
  const words = WORDS.filter((w) => w.f >= a && w.f < b);
  const hlN = hl.map(norm);
  const out = interpolate(f, [b, b + 10], [1, 0], {...clamp, easing: ease.in});
  const place: React.CSSProperties =
    pos === 'bottom' ? {justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 90} :
    pos === 'top' ? {justifyContent: 'flex-start', alignItems: 'center', paddingTop: 80} :
    pos === 'left' ? {justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 110} :
    {justifyContent: 'center', alignItems: 'center'};
  return (
    <AbsoluteFill style={{...place, pointerEvents: 'none'}}>
      <div style={{maxWidth: pos === 'left' ? 900 : 1500, display: 'flex', flexWrap: 'wrap', justifyContent: pos === 'left' ? 'flex-start' : 'center', columnGap: size * 0.28, rowGap: 4, opacity: out, fontFamily: display, fontWeight: 800, fontSize: size, lineHeight: 1.08, letterSpacing: '-0.03em', color: C.white, textShadow: '0 6px 30px rgba(0,0,0,0.65)'}}>
        {words.map((w, i) => {
          const p = interpolate(f, [w.f - 2, w.f + 6], [0, 1], {...clamp, easing: ease.out});
          const isHl = hlN.includes(norm(w.t));
          const txt = upper ? w.t.toUpperCase() : w.t;
          return (
            <span key={i} style={{display: 'inline-block', opacity: p, translate: `0 ${(1 - p) * 30}px`, scale: String(isHl ? 0.7 + p * 0.3 : 1), filter: `blur(${(1 - p) * 6}px)`, color: isHl ? hlColor : undefined, textShadow: isHl ? `0 0 30px ${hlColor}88, 0 6px 30px rgba(0,0,0,0.6)` : undefined}}>
              {txt.replace(/[,.]$/, '')}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
