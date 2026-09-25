import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {Icon, IconName} from '../ui/Icon';
import {Shell} from '../ui/Shell';

const NODES: {t: string; s: string; icon: IconName; x: number; at: number}[] = [
  {t: 'FORMULÁRIO', s: 'você conta o seu caso', icon: 'form', x: 360, at: 0},
  {t: 'ANÁLISE', s: 'especialista estuda seu perfil', icon: 'analysis', x: 960, at: 10},
  {t: 'CALL', s: 'chega pronto para agir', icon: 'video', x: 1560, at: 76},
];

/** Formulário → análise → call; briefing viajando até o especialista. Starts at output 3117. */
export const S17_Fluxo: React.FC = () => {
  const f = useCurrentFrame();
  const doc = interpolate(f, [4, 40, 90, 120], [360, 960, 960, 1560], {...clamp, easing: ease.inOut});
  const line = interpolate(f, [0, 120], [0, 1], {...clamp, easing: ease.inOut});
  const ready = interpolate(f, [136, 146], [0, 1], {...clamp, easing: ease.back});
  return (
    <Shell bg tin="depth" tout="whipR">
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 80}}>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 70, color: C.white, letterSpacing: '-0.03em', opacity: interpolate(f, [2, 14], [0, 1], clamp)}}>O especialista chega <span style={{color: C.violetLight}}>pronto.</span></div>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 360, top: 440, width: 1200, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4}}>
        <div style={{width: `${line * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.violet}, ${C.mint})`, boxShadow: `0 0 20px ${C.violet}`}} />
      </div>
      {NODES.map((n) => {
        const p = interpolate(f, [n.at, n.at + 14], [0, 1], {...clamp, easing: ease.back});
        const lit = n.t === 'CALL' ? ready : 1;
        return (
          <div key={n.t} style={{position: 'absolute', left: n.x - 170, top: 300, width: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: p, scale: String(p)}}>
            <div style={{width: 280, height: 280, borderRadius: 60, background: 'rgba(22,18,38,0.95)', border: `2px solid ${n.t === 'CALL' && lit > 0.5 ? C.mint : C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${n.t === 'CALL' ? lit * 80 : 30}px -10px ${n.t === 'CALL' ? C.mint : C.violet}`, position: 'relative'}}>
              <Icon name={n.icon} size={110} at={n.at + 4} color={n.t === 'CALL' && lit > 0.5 ? C.mint : C.violetLight} />
              {n.t === 'CALL' ? <div style={{position: 'absolute', top: -20, right: -30, padding: '10px 18px', borderRadius: 14, background: C.mint, color: C.bg, fontFamily: display, fontWeight: 800, fontSize: 24, scale: String(ready), opacity: ready}}>PRONTO ✓</div> : null}
              {n.t === 'ANÁLISE' ? <div style={{position: 'absolute', inset: -14, borderRadius: 70, border: `2px dashed ${C.violetLight}`, rotate: `${f * 1.5}deg`, opacity: interpolate(f, [40, 50, 110, 120], [0, 1, 1, 0], clamp)}} /> : null}
            </div>
            <div style={{fontFamily: display, fontWeight: 800, fontSize: 42, color: C.white, marginTop: 26}}>{n.t}</div>
            <div style={{fontFamily: body, fontSize: 22, color: C.muted, marginTop: 4}}>{n.s}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: doc - 55, top: 200, width: 110, height: 140, borderRadius: 14, background: C.white, boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 40px ${C.glow}`, padding: 14, opacity: interpolate(f, [4, 10, 118, 126], [0, 1, 1, 0], clamp), rotate: `${Math.sin(f / 8) * 4}deg`}}>
        <div style={{fontFamily: mono, fontWeight: 700, fontSize: 12, color: C.violet}}>BRIEFING</div>
        {[80, 60, 70, 50, 65].map((w, i) => <div key={i} style={{height: 6, width: `${w}%`, background: '#d8d3ea', borderRadius: 4, marginTop: 9}} />)}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 100, textAlign: 'center', fontFamily: mono, fontSize: 24, color: C.violetLight, letterSpacing: '0.2em', opacity: interpolate(f, [44, 56], [0, 1], clamp)}}>BRIEFING RECEBIDO · PERFIL ANALISADO ANTES DA CALL</div>
    </Shell>
  );
};
