import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, display, ease, mono} from '../theme';
import {rand} from '../ui/anim';
import {Icon, IconName} from '../ui/Icon';
import {Shell} from '../ui/Shell';

const NODES: {t: string; at: number; icon: IconName}[] = [
  {t: 'ASSISTE', at: 5, icon: 'play'},
  {t: 'ENTENDE', at: 21, icon: 'analysis'},
  {t: 'CONCORDA', at: 42, icon: 'check'},
  {t: 'TRAVA', at: 73, icon: 'lock'},
];

/** Assiste → entende → concorda → TRAVA. Starts at output 1715. */
export const S09_Trava: React.FC = () => {
  const raw = useCurrentFrame();
  // hard freeze for 6 frames at the lock, with stutter
  const f = raw >= 73 && raw < 79 ? 73 : raw;
  const bar = interpolate(f, [5, 21, 42, 73], [0.08, 0.36, 0.64, 0.86], {...clamp, easing: ease.inOut});
  const glitch = raw >= 73 && raw < 86;
  const gx = glitch ? (rand(raw * 7) - 0.5) * 30 : 0;
  const red = interpolate(raw, [73, 76], [0, 1], clamp);
  const sub = interpolate(raw, [84, 96], [0, 1], clamp);
  return (
    <Shell bg tin="whipR" tout="blur" grid={false}>
      <AbsoluteFill style={{translate: `${gx}px 0`}}>
        <div style={{position: 'absolute', left: 200, right: 200, top: 520, height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.08)'}}>
          <div style={{width: `${bar * 100}%`, height: '100%', borderRadius: 8, background: red > 0 ? C.coral : `linear-gradient(90deg, ${C.violet}, ${C.violetLight})`, boxShadow: `0 0 30px ${red > 0 ? C.coral : C.violet}`}} />
        </div>
        {NODES.map((n, i) => {
          const p = interpolate(f, [n.at, n.at + 14], [0, 1], {...clamp, easing: ease.back});
          const isT = n.t === 'TRAVA';
          const col = isT ? C.coral : C.violetLight;
          const x = 200 + (i / 3) * 1520 * 0.86 + 20;
          return (
            <div key={n.t} style={{position: 'absolute', left: x - 150, top: 330, width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: p, scale: String(0.6 + p * 0.4)}}>
              <div style={{width: 130, height: 130, borderRadius: 34, background: isT ? 'rgba(255,90,106,0.14)' : 'rgba(124,92,255,0.14)', border: `2px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 50px -10px ${col}`}}>
                <Icon name={n.icon} size={64} color={col} at={n.at} stroke={2} />
              </div>
              <div style={{height: 120}} />
              <div style={{fontFamily: display, fontWeight: 800, fontSize: isT ? 92 : 58, color: isT ? C.coral : C.white, letterSpacing: '-0.03em', textShadow: isT ? `${gx * 0.4}px 0 0 #00e5ff, ${-gx * 0.4}px 0 0 ${C.coral}` : undefined}}>{n.t}</div>
            </div>
          );
        })}
        {glitch ? new Array(6).fill(0).map((_, i) => (
          <div key={i} style={{position: 'absolute', left: 0, right: 0, top: rand(raw + i) * 1080, height: 4 + rand(raw * 2 + i) * 30, background: i % 2 ? 'rgba(255,90,106,0.35)' : 'rgba(0,229,255,0.25)', translate: `${(rand(raw + i * 9) - 0.5) * 200}px 0`, mixBlendMode: 'screen'}} />
        )) : null}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 150, textAlign: 'center', fontFamily: mono, fontSize: 32, letterSpacing: '0.24em', color: C.coral, opacity: sub}}>NA HORA DE APLICAR</div>
      </AbsoluteFill>
    </Shell>
  );
};

/** "Não é porque o método é ruim. Ele funciona." Starts at output 1829, over the camera. */
export const S09b_Funciona: React.FC = () => {
  const f = useCurrentFrame();
  const strike = interpolate(f, [22, 32], [0, 1], {...clamp, easing: ease.inOut});
  const ok = interpolate(f, [44, 56], [0, 1], {...clamp, easing: ease.back});
  const o = interpolate(f, [62, 72], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 110, top: 360, display: 'flex', flexDirection: 'column', gap: 26}}>
        <div style={{position: 'relative', alignSelf: 'flex-start', padding: '18px 30px', borderRadius: 18, background: 'rgba(12,10,22,0.8)', border: `1px solid ${C.lineSoft}`, fontFamily: display, fontWeight: 800, fontSize: 54, color: C.muted, opacity: interpolate(f, [2, 12], [0, 1], clamp)}}>
          O MÉTODO É RUIM
          <div style={{position: 'absolute', left: 20, top: '52%', height: 8, width: `${strike * 92}%`, background: C.coral, borderRadius: 6}} />
        </div>
        <div style={{alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 18, padding: '18px 32px', borderRadius: 18, background: C.mint, fontFamily: display, fontWeight: 800, fontSize: 60, color: C.bg, scale: String(ok), opacity: ok, transformOrigin: 'left center'}}>
          <svg width="48" height="48" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" stroke={C.bg} strokeWidth="3.4" fill="none" strokeLinecap="round" /></svg>
          ELE FUNCIONA
        </div>
      </div>
    </AbsoluteFill>
  );
};
