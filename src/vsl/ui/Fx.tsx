import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {clamp, display, C} from '../theme';

/** Short light flash used on hard cuts. Absolute frame `at`. */
export const Flash: React.FC<{at: number; color?: string; peak?: number}> = ({at, color = '#fff', peak = 0.6}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - 2, at, at + 8], [0, peak, 0], clamp);
  if (o <= 0) return null;
  return <AbsoluteFill style={{background: color, opacity: o, mixBlendMode: 'screen', pointerEvents: 'none'}} />;
};

/** One-off kinetic line placed at absolute frames [a, b]. */
export const Line: React.FC<{a: number; b: number; children: React.ReactNode; pos?: 'bottom' | 'top'}> = ({a, b, children, pos = 'bottom'}) => {
  const f = useCurrentFrame();
  const p = Math.min(interpolate(f, [a, a + 8], [0, 1], clamp), interpolate(f, [b - 6, b], [1, 0], clamp));
  if (p <= 0) return null;
  return (
    <AbsoluteFill style={{justifyContent: pos === 'bottom' ? 'flex-end' : 'flex-start', alignItems: 'center', padding: '90px 0'}}>
      <div style={{fontFamily: display, fontWeight: 800, fontSize: 70, color: C.white, letterSpacing: '-0.03em', opacity: p, translate: `0 ${(1 - p) * 30}px`, textShadow: '0 6px 30px rgba(0,0,0,0.7)'}}>{children}</div>
    </AbsoluteFill>
  );
};
