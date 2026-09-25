import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {pop} from '../ui/anim';
import {Icon, IconName} from '../ui/Icon';
import {Tag} from '../ui/Type';

const DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];

/** Slots grid of the week. `fill` = frame at which each slot books. */
const Slots: React.FC<{fillAt: (i: number) => number; w?: number}> = ({fillAt, w = 820}) => {
  const f = useCurrentFrame();
  return (
    <div style={{width: w}}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12}}>
        {DAYS.map((d) => <div key={d} style={{fontFamily: mono, fontSize: 18, color: C.muted, textAlign: 'center', letterSpacing: '0.16em'}}>{d}</div>)}
        {new Array(10).fill(0).map((_, i) => {
          const at = fillAt(i);
          const p = interpolate(f, [at, at + 8], [0, 1], {...clamp, easing: ease.back});
          return (
            <div key={i} style={{height: 70, borderRadius: 14, border: `1.5px solid ${p > 0.5 ? C.violetLight : C.lineSoft}`, background: p > 0.5 ? `rgba(124,92,255,${0.25 + p * 0.25})` : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: mono, fontSize: 18, color: p > 0.5 ? C.white : C.muted}}>
              {p > 0.5 ? <><Icon name="profile" size={22} color={C.white} glow={false} idle={false} /><span style={{scale: String(p)}}>RESERVADO</span></> : 'LIVRE'}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** "limite de vagas real" — banner. Output 4573, camera left (53 frames). */
export const S23a_Banner: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, 10], [0, 1], clamp), interpolate(f, [46, 53], [1, 0], clamp));
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: 'linear-gradient(270deg, rgba(7,6,12,0.96) 0%, rgba(7,6,12,0.85) 52%, rgba(7,6,12,0) 60%)'}} />
      <div style={{position: 'absolute', left: 860, top: 220}}>
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 16, padding: '16px 30px', borderRadius: 16, background: `linear-gradient(90deg, ${C.violet}, #5a3fe0)`, fontFamily: display, fontWeight: 800, fontSize: 52, color: C.white, clipPath: `inset(0 ${(1 - interpolate(f, [2, 14], [0, 1], {...clamp, easing: ease.out})) * 100}% 0 0 round 16px)`, boxShadow: `0 0 60px ${C.glow}`}}>
          <Icon name="calendar" size={48} color="white" glow={false} at={2} /> VAGAS DA SEMANA
        </div>
        <div style={{fontFamily: mono, fontSize: 24, color: C.amber, letterSpacing: '0.2em', margin: '22px 0 34px'}}>LIMITE REAL</div>
        <Slots fillAt={(i) => 14 + i * 3} w={880} />
      </div>
    </AbsoluteFill>
  );
};

const ONE: {t: string; icon: IconName; at: number}[] = [
  {t: '1 ESPECIALISTA', icon: 'expert', at: 70},
  {t: '1 CALL', icon: 'video', at: 80},
  {t: '1 PERFIL', icon: 'instagram', at: 90},
];

/** "cada call é com um especialista, um ser humano de verdade" → enche → próxima semana. Output 4666, 327 frames. */
export const S23b_Humano: React.FC = () => {
  const f = useCurrentFrame();
  const a = Math.min(interpolate(f, [0, 10], [0, 1], clamp), interpolate(f, [150, 158], [1, 0], clamp));
  const b = Math.min(interpolate(f, [156, 164], [0, 1], clamp), interpolate(f, [224, 230], [1, 0], clamp));
  const c = interpolate(f, [230, 240], [0, 1], clamp) * interpolate(f, [318, 327], [1, 0], clamp);
  const full = pop(f, 206, 30, 9);
  const shift = interpolate(f, [262, 290], [0, 1], {...clamp, easing: ease.inOut});
  return (
    <AbsoluteFill>
      {/* A — camera right: 1 especialista / 1 call / 1 perfil */}
      <AbsoluteFill style={{opacity: a}}>
        <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(7,6,12,0.95) 0%, rgba(7,6,12,0.8) 55%, rgba(7,6,12,0) 64%)'}} />
        <div style={{position: 'absolute', left: 120, top: 150}}>
          <Tag at={4}>POUCAS VAGAS POR SEMANA</Tag>
          <div style={{display: 'flex', flexDirection: 'column', gap: 22, marginTop: 40}}>
            {ONE.map((o) => {
              const p = interpolate(f, [o.at, o.at + 14], [0, 1], {...clamp, easing: ease.out});
              return (
                <div key={o.t} style={{display: 'flex', alignItems: 'center', gap: 26, opacity: p, translate: `${(1 - p) * -60}px 0`}}>
                  <div style={{width: 100, height: 100, borderRadius: 28, background: 'rgba(124,92,255,0.16)', border: `1.5px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name={o.icon} size={54} at={o.at} /></div>
                  <div style={{fontFamily: display, fontWeight: 800, fontSize: 84, color: C.white, letterSpacing: '-0.04em'}}>{o.t}</div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop: 44, display: 'inline-flex', alignItems: 'center', gap: 14, padding: '16px 26px', borderRadius: 16, border: `1.5px solid ${C.mint}`, background: 'rgba(77,240,192,0.1)', fontFamily: mono, fontWeight: 700, fontSize: 26, color: C.mint, letterSpacing: '0.16em', opacity: interpolate(f, [122, 134], [0, 1], clamp)}}>
            <Icon name="profile" size={30} color={C.mint} glow={false} at={122} /> ANÁLISE HUMANA — NÃO É AUTOMÁTICA
          </div>
        </div>
      </AbsoluteFill>
      {/* B — full screen: slots fill up */}
      <AbsoluteFill style={{opacity: b, background: C.bg, justifyContent: 'center', alignItems: 'center'}}>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 64, color: C.white, marginBottom: 40}}>Quando enche, <span style={{color: C.coral}}>enche.</span></div>
        <Slots fillAt={(i) => 160 + i * 4} w={1200} />
        <div style={{position: 'absolute', rotate: '-8deg', padding: '20px 60px', border: `8px solid ${C.coral}`, borderRadius: 20, fontFamily: display, fontWeight: 800, fontSize: 130, color: C.coral, letterSpacing: '0.04em', scale: String(2 - full), opacity: full, top: 470, textShadow: `0 0 40px ${C.coral}88`, background: 'rgba(7,6,12,0.6)'}}>LOTADO</div>
      </AbsoluteFill>
      {/* C — bubble camera: next window next week */}
      <AbsoluteFill style={{opacity: c}}>
        <AbsoluteFill style={{background: C.bg}} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{display: 'flex', gap: 40, translate: `${-shift * 280}px 0`}}>
            {['ESTA SEMANA', 'PRÓXIMA SEMANA'].map((w, i) => (
              <div key={w} style={{width: 520, padding: 34, borderRadius: 28, background: 'rgba(22,18,38,0.92)', border: `1.5px solid ${i === 1 && shift > 0.6 ? C.mint : C.line}`, opacity: i === 0 ? 1 - shift * 0.6 : 0.5 + shift * 0.5}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <div style={{fontFamily: mono, fontWeight: 700, fontSize: 24, color: i === 0 ? C.coral : C.mint, letterSpacing: '0.18em'}}>{w}</div>
                  <Icon name={i === 0 ? 'lock' : 'calendar'} size={40} color={i === 0 ? C.coral : C.mint} at={236} glow={false} />
                </div>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 24}}>
                  {new Array(10).fill(0).map((_, k) => <div key={k} style={{height: 44, borderRadius: 10, background: i === 0 ? 'rgba(255,90,106,0.3)' : 'rgba(77,240,192,0.12)', border: `1px solid ${i === 0 ? `${C.coral}66` : `${C.mint}44`}`}} />)}
                </div>
                <div style={{fontFamily: display, fontWeight: 800, fontSize: 40, color: C.white, marginTop: 24}}>{i === 0 ? 'Esgotada' : 'Próxima janela'}</div>
              </div>
            ))}
          </div>
          <div style={{position: 'absolute', bottom: 150, fontFamily: body, fontWeight: 600, fontSize: 30, color: C.muted, opacity: interpolate(f, [290, 300], [0, 1], clamp)}}>a próxima janela só abre na próxima semana</div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
