import React from 'react';
import {C} from '../theme';

export const Glass: React.FC<{children?: React.ReactNode; style?: React.CSSProperties; radius?: number; glow?: string}> = ({children, style, radius = 28, glow}) => (
  <div style={{background: 'linear-gradient(160deg, rgba(40,32,70,0.78), rgba(16,13,28,0.86))', border: `1px solid ${C.line}`, borderRadius: radius, boxShadow: `0 40px 120px -30px ${glow ?? 'rgba(0,0,0,0.8)'}, inset 0 1px 0 rgba(255,255,255,0.1)`, backdropFilter: 'blur(18px)', ...style}}>
    {children}
  </div>
);
