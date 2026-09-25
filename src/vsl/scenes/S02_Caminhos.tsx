import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {Glass} from '../ui/Glass';
import {Icon} from '../ui/Icon';
import {Tag} from '../ui/Type';
import {Shell} from '../ui/Shell';

/** Aplicar vs deixar parado. Starts at output 140. */
export const S02_Caminhos: React.FC = () => {
  const f = useCurrentFrame();
  const arrow = interpolate(f, [4, 30], [0, 1], {...clamp, easing: ease.inOut});
  const L = interpolate(f, [24, 42], [0, 1], {...clamp, easing: ease.out});
  const R = interpolate(f, [62, 80], [0, 1], {...clamp, easing: ease.out});
  const chart = interpolate(f, [34, 110], [0, 1], {...clamp, easing: ease.inOut});
  const pts = new Array(12).fill(0).map((_, i) => [i * 52, 250 - Math.pow(i / 11, 1.8) * 220 - Math.sin(i * 1.7) * 10]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  return (
    <Shell bg tin="zoom" tout="whipL">
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 70}}>
        <Tag at={0}>A DIFERENÇA ENTRE</Tag>
      </AbsoluteFill>
      <svg width="1920" height="1080" style={{position: 'absolute'}}>
        <circle cx="960" cy="200" r="10" fill={C.white} opacity={arrow} />
        <path d="M960 200 C 960 280, 520 250, 520 330" stroke={C.mint} strokeWidth="4" fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - arrow} />
        <path d="M960 200 C 960 280, 1400 250, 1400 330" stroke={C.coral} strokeWidth="4" fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - arrow} opacity={0.8} />
      </svg>
      {/* APLICAR */}
      <div style={{position: 'absolute', left: 170, top: 340, width: 700, opacity: L, translate: `0 ${(1 - L) * 40}px`}}>
        <Glass glow="rgba(77,240,192,0.35)" style={{padding: 40, height: 580}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <Icon name="trend" size={54} color={C.mint} at={26} />
            <div style={{fontFamily: display, fontWeight: 800, fontSize: 76, color: C.mint, letterSpacing: '-0.03em'}}>APLICAR</div>
          </div>
          <div style={{fontFamily: body, fontSize: 24, color: C.muted, marginTop: 6}}>perfil crescendo com o método</div>
          <svg width="620" height="270" style={{marginTop: 30, overflow: 'visible'}}>
            <defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.mint} stopOpacity="0.35" /><stop offset="1" stopColor={C.mint} stopOpacity="0" /></linearGradient></defs>
            <path d={`${path} L572,270 L0,270 Z`} fill="url(#ga)" opacity={chart} />
            <path d={path} stroke={C.mint} strokeWidth="5" fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - chart} strokeLinecap="round" />
          </svg>
          <div style={{display: 'flex', gap: 30, marginTop: 10, fontFamily: mono, fontSize: 22, color: C.white}}>
            <span style={{display: 'flex', alignItems: 'center', gap: 10}}><Icon name="users" size={28} color={C.mint} at={40} glow={false} />alcance subindo</span>
            <span style={{display: 'flex', alignItems: 'center', gap: 10}}><Icon name="eye" size={28} color={C.mint} at={50} glow={false} />em movimento</span>
          </div>
        </Glass>
      </div>
      {/* DEIXAR PARADO */}
      <div style={{position: 'absolute', left: 1050, top: 340, width: 700, opacity: R, translate: `0 ${(1 - R) * 40}px`, filter: `saturate(${interpolate(f, [80, 140], [1, 0.35], clamp)})`}}>
        <Glass style={{padding: 40, height: 580}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <Icon name="lock" size={54} color={C.coral} at={64} />
            <div style={{fontFamily: display, fontWeight: 800, fontSize: 76, color: C.coral, letterSpacing: '-0.03em'}}>DEIXAR PARADO</div>
          </div>
          <div style={{fontFamily: body, fontSize: 24, color: C.muted, marginTop: 6}}>esquecido na área de membros</div>
          <div style={{marginTop: 34, position: 'relative', height: 330}}>
            {[0, 1, 2, 3].map((i) => {
              const s = i === 0 ? 80 : 146 + (i - 1) * 16;
              const p = interpolate(f, [s, s + 14], [0, 1], {...clamp, easing: ease.back});
              return (
                <div key={i} style={{position: 'absolute', left: i * 26, top: i * 22, width: 560, height: 160, borderRadius: 20, background: '#1a1628', border: `1px solid ${C.lineSoft}`, padding: 22, display: 'flex', gap: 20, opacity: p, scale: String(0.9 + 0.1 * p), boxShadow: '0 20px 40px rgba(0,0,0,.5)'}}>
                  <div style={{width: 150, height: 116, borderRadius: 12, background: 'linear-gradient(135deg,#2b2640,#15121f)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name="play" size={40} color={C.muted} glow={false} idle={false} /></div>
                  <div style={{flex: 1}}>
                    <div style={{fontFamily: display, fontWeight: 700, fontSize: 26, color: C.white}}>{i === 0 ? 'Seu curso' : 'Curso comprado'}</div>
                    <div style={{fontFamily: body, fontSize: 18, color: C.muted, marginTop: 6}}>Área de membros</div>
                    <div style={{height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.08)', marginTop: 22}}><div style={{width: '2%', height: '100%', borderRadius: 8, background: C.coral}} /></div>
                    <div style={{fontFamily: mono, fontSize: 16, color: C.coral, marginTop: 8}}>PROGRESSO 0%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Glass>
      </div>
    </Shell>
  );
};
