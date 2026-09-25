import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {pop, rand} from '../ui/anim';
import {Icon} from '../ui/Icon';
import {Backdrop} from '../ui/Backdrop';
import {Tag} from '../ui/Type';

/** Ancoragem: consultoria individual — R$497. Output 4125, camera on the right. */
export const S21_Ancora: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, 12], [0, 1], clamp), interpolate(f, [136, 146], [1, 0], clamp));
  const price = pop(f, 116, 30, 12);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(7,6,12,0.95) 0%, rgba(7,6,12,0.8) 55%, rgba(7,6,12,0) 64%)'}} />
      <div style={{position: 'absolute', left: 120, top: 200, width: 960}}>
        <Tag at={2}>CONSULTORIA INDIVIDUAL</Tag>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 30, opacity: interpolate(f, [40, 52], [0, 1], clamp)}}>
          <Icon name="expert" size={60} at={40} />
          <div style={{fontFamily: body, fontWeight: 600, fontSize: 36, color: C.muted}}>com alguém do meu time</div>
        </div>
        <div style={{fontFamily: mono, fontSize: 26, color: C.muted, letterSpacing: '0.2em', marginTop: 60, opacity: interpolate(f, [86, 98], [0, 1], clamp)}}>CUSTA PELO MENOS</div>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 260, lineHeight: 1, color: C.white, letterSpacing: '-0.05em', scale: String(0.7 + price * 0.3), opacity: price, transformOrigin: 'left center'}}>
          <span style={{fontSize: 110, verticalAlign: 'top', marginRight: 10}}>R$</span>497
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Chip that keeps the anchor on screen while Marcão talks (output 4271 → 4463). */
export const S21b_AnchorChip: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, 10], [0, 1], clamp), interpolate(f, [182, 192], [1, 0], clamp));
  return (
    <div style={{position: 'absolute', left: 80, top: 70, opacity: o, padding: '16px 26px', borderRadius: 18, background: 'rgba(12,10,22,0.8)', border: `1px solid ${C.lineSoft}`, fontFamily: mono, fontSize: 22, color: C.muted, letterSpacing: '0.12em'}}>
      CONSULTORIA INDIVIDUAL <span style={{fontFamily: display, fontWeight: 800, fontSize: 34, color: C.white, marginLeft: 12, letterSpacing: 0}}>R$497</span>
    </div>
  );
};

/** R$497 → R$197, 197 dominant. Starts at output 4463 (110 frames). */
export const S22_Oferta: React.FC = () => {
  const f = useCurrentFrame();
  const inn = interpolate(f, [0, 12], [0, 1], {...clamp, easing: ease.out});
  const strike = interpolate(f, [50, 58], [0, 1], {...clamp, easing: ease.inOut});
  const drop = pop(f, 59, 30, 9, 0.8);
  const old = interpolate(f, [58, 70], [0, 1], {...clamp, easing: ease.inOut});
  const shake = f >= 59 && f < 66 ? (rand(f) - 0.5) * 20 : 0;
  return (
    <AbsoluteFill style={{opacity: inn}}>
      <Backdrop hue="mint" intensity={0.3 + drop * 0.7} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', translate: `${shake}px 0`}}>
        <div style={{fontFamily: mono, fontSize: 28, color: C.muted, letterSpacing: '0.3em', marginBottom: 40, opacity: interpolate(f, [4, 14], [0, 1], clamp)}}>ESSA MESMA REUNIÃO · NESTA PÁGINA</div>
        <div style={{position: 'relative', fontFamily: display, fontWeight: 800, fontSize: interpolate(old, [0, 1], [240, 90]), lineHeight: 1, color: interpolate(old, [0, 1], [1, 0]) > 0.5 ? C.white : C.muted, letterSpacing: '-0.05em', opacity: interpolate(old, [0, 1], [1, 0.8]), translate: `0 ${interpolate(old, [0, 1], [0, -10])}px`}}>
          R$497
          <div style={{position: 'absolute', left: -10, right: -10, top: '52%', height: interpolate(old, [0, 1], [18, 7]), background: C.coral, borderRadius: 8, scale: `${strike} 1`, transformOrigin: 'left center', rotate: '-6deg'}} />
        </div>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 380, lineHeight: 0.9, letterSpacing: '-0.06em', color: C.mint, scale: String(drop), opacity: Math.min(1, drop * 1.5), textShadow: `0 0 120px rgba(77,240,192,0.55)`, height: drop > 0 ? undefined : 0}}>
          <span style={{fontSize: 150, verticalAlign: 'top', marginRight: 14}}>R$</span>197
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
