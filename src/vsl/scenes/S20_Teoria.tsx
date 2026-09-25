import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {rand} from '../ui/anim';
import {Shell} from '../ui/Shell';

const TASKS = ['Reescrever a bio', 'Gravar o 1º reel com o método', 'Ajustar o formato do feed', 'Postar seguindo o plano'];

/** TEORIA se desfaz → PLANO DE AÇÃO → LISTA DE TAREFAS → checklist. Starts at output 3978. */
export const S20_Teoria: React.FC = () => {
  const f = useCurrentFrame();
  const dis = interpolate(f, [28, 46], [0, 1], {...clamp, easing: ease.in});
  const plan = Math.min(interpolate(f, [46, 56], [0, 1], {...clamp, easing: ease.out}), interpolate(f, [60, 66], [1, 0], clamp));
  const list = interpolate(f, [63, 76], [0, 1], {...clamp, easing: ease.out});
  const letters = 'TEORIA'.split('');
  return (
    <Shell bg tin="blur" tout="whipL">
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{display: 'flex', fontFamily: display, fontWeight: 800, fontSize: 240, color: C.muted, letterSpacing: '-0.03em'}}>
          {letters.map((l, i) => (
            <span key={i} style={{display: 'inline-block', opacity: interpolate(f, [0, 8], [0, 1], clamp) * (1 - dis), translate: `${(rand(i) - 0.5) * 500 * dis}px ${(rand(i + 4) - 0.8) * 500 * dis}px`, rotate: `${(rand(i + 2) - 0.5) * 120 * dis}deg`, filter: `blur(${dis * 14}px)`}}>{l}</span>
          ))}
        </div>
        {new Array(40).fill(0).map((_, i) => (
          <div key={i} style={{position: 'absolute', left: 960 + (rand(i) - 0.5) * 900 * (0.3 + dis), top: 540 + (rand(i + 1) - 0.5) * 300 - dis * 200 * rand(i + 3), width: 6, height: 6, borderRadius: 2, background: C.muted, opacity: dis > 0 && dis < 1 ? (1 - dis) : 0}} />
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: plan, scale: String(0.9 + plan * 0.1)}}>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 170, color: C.white, letterSpacing: '-0.05em'}}>PLANO DE <span style={{color: C.violetLight}}>AÇÃO</span></div>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: list}}>
        <div style={{width: 900, padding: 44, borderRadius: 32, background: 'rgba(22,18,38,0.92)', border: `1px solid ${C.line}`, translate: `0 ${(1 - list) * 80}px`, boxShadow: `0 50px 120px -30px rgba(0,0,0,.9)`}}>
          <div style={{fontFamily: mono, fontSize: 22, color: C.violetLight, letterSpacing: '0.24em'}}>LISTA DE TAREFAS</div>
          {TASKS.map((t, i) => {
            const at = 84 + i * 14;
            const ck = interpolate(f, [at, at + 10], [0, 1], {...clamp, easing: ease.out});
            return (
              <div key={t} style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 24, opacity: interpolate(f, [66 + i * 4, 76 + i * 4], [0, 1], clamp)}}>
                <div style={{width: 46, height: 46, borderRadius: 12, border: `2px solid ${C.mint}`, background: ck > 0.1 ? C.mint : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" stroke={C.bg} strokeWidth="3.4" fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ck} /></svg>
                </div>
                <div style={{position: 'relative', fontFamily: body, fontWeight: 600, fontSize: 36, color: ck > 0.5 ? C.muted : C.white}}>
                  {t}
                  <div style={{position: 'absolute', left: 0, top: '54%', height: 3, width: `${ck * 100}%`, background: C.muted}} />
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Shell>
  );
};
