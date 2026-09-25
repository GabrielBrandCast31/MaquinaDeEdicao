import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {pop} from '../ui/anim';
import {Cursor} from '../ui/Cursor';
import {Glass} from '../ui/Glass';
import {Icon} from '../ui/Icon';

/** "o botão está aqui embaixo" — arrow + button hint. Output 4993 (102 frames), over the camera. */
export const S24_BotaoAbaixo: React.FC = () => {
  const f = useCurrentFrame();
  const p = interpolate(f, [58, 72], [0, 1], {...clamp, easing: ease.back});
  const bob = Math.sin(f / 5) * 14;
  const o = interpolate(f, [92, 102], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: o, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 60}}>
      <svg width="80" height="120" style={{translate: `0 ${bob}px`, opacity: interpolate(f, [50, 60], [0, 1], clamp), filter: `drop-shadow(0 0 20px ${C.violet})`}}>
        <path d="M40 0 V100 M12 72 L40 102 L68 72" stroke={C.white} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{marginTop: 20, padding: '26px 60px', borderRadius: 22, background: `linear-gradient(90deg, ${C.violet}, #5a3fe0)`, fontFamily: display, fontWeight: 800, fontSize: 44, color: C.white, scale: String(p), opacity: p, boxShadow: `0 0 80px ${C.glow}`}}>GARANTIR A MINHA VAGA</div>
    </AbsoluteFill>
  );
};

/** Calendário: escolhe data → horário selecionado → call agendada → especialista reservado. Output 5095, camera right. */
export const S25_Agenda: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, 12], [0, 1], clamp), interpolate(f, [266, 277], [1, 0], clamp));
  const dateSel = f >= 42;
  const slotSel = f >= 62;
  const agendada = pop(f, 97, 30, 10);
  const conf = interpolate(f, [120, 138], [0, 1], {...clamp, easing: ease.out});
  const cal = 1 - interpolate(f, [114, 126], [0, 1], clamp);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(7,6,12,0.95) 0%, rgba(7,6,12,0.8) 55%, rgba(7,6,12,0) 64%)'}} />
      <div style={{position: 'absolute', left: 110, top: 90, opacity: cal, scale: String(0.96 + cal * 0.04)}}>
        <Glass style={{width: 960, padding: 36, display: 'flex', gap: 34}}>
          <div style={{flex: 1.3}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              <Icon name="calendar" size={40} at={2} />
              <div style={{fontFamily: display, fontWeight: 800, fontSize: 36, color: C.white}}>Escolha o dia</div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 24}}>
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i} style={{fontFamily: mono, fontSize: 16, color: C.muted, textAlign: 'center'}}>{d}</div>)}
              {new Array(35).fill(0).map((_, i) => {
                const day = i - 2;
                const sel = dateSel && day === 17;
                const avail = day > 11 && day < 25 && i % 7 !== 0 && i % 7 !== 6;
                return (
                  <div key={i} style={{height: 58, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: body, fontWeight: 600, fontSize: 22, color: day < 1 || day > 30 ? 'transparent' : sel ? C.bg : avail ? C.white : 'rgba(255,255,255,0.25)', background: sel ? C.violetLight : avail ? 'rgba(124,92,255,0.12)' : 'transparent', border: sel ? 'none' : avail ? `1px solid ${C.line}` : 'none', scale: sel ? String(pop(f, 42, 30, 10)) : '1'}}>
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{flex: 1, opacity: interpolate(f, [44, 54], [0, 1], clamp)}}>
            <div style={{fontFamily: display, fontWeight: 800, fontSize: 30, color: C.white, marginTop: 4}}>Horários</div>
            {['09:00', '10:30', '14:00', '16:30', '19:00'].map((h, i) => {
              const sel = slotSel && i === 2;
              return (
                <div key={h} style={{marginTop: 14, padding: '16px 20px', borderRadius: 14, fontFamily: mono, fontWeight: 700, fontSize: 26, color: sel ? C.bg : C.white, background: sel ? C.mint : 'rgba(255,255,255,0.04)', border: `1px solid ${sel ? C.mint : C.lineSoft}`, display: 'flex', justifyContent: 'space-between'}}>
                  {h}{sel ? <span>✓</span> : null}
                </div>
              );
            })}
          </div>
        </Glass>
        <div style={{display: 'flex', gap: 18, marginTop: 24}}>
          <div style={{padding: '16px 26px', borderRadius: 16, background: 'rgba(77,240,192,0.14)', border: `1.5px solid ${C.mint}`, fontFamily: display, fontWeight: 800, fontSize: 30, color: C.mint, opacity: slotSel ? 1 : 0, scale: String(pop(f, 64, 30, 12))}}>HORÁRIO SELECIONADO ✓</div>
          <div style={{padding: '16px 26px', borderRadius: 16, background: C.mint, fontFamily: display, fontWeight: 800, fontSize: 30, color: C.bg, opacity: agendada, scale: String(agendada)}}>CALL AGENDADA ✓</div>
        </div>
      </div>
      <Cursor path={[{f: 20, x: 900, y: 800}, {f: 38, x: 440, y: 470}, {f: 50, x: 440, y: 470}, {f: 60, x: 880, y: 400}, {f: 90, x: 880, y: 400}]} clicks={[40, 61]} />
      {/* confirmation */}
      <div style={{position: 'absolute', left: 110, top: 200, opacity: conf, translate: `0 ${(1 - conf) * 60}px`}}>
        <Glass style={{width: 900, padding: 44}} glow="rgba(77,240,192,0.3)">
          <div style={{fontFamily: mono, fontSize: 22, color: C.mint, letterSpacing: '0.24em'}}>RESERVADO PARA VOCÊ</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 30, marginTop: 28}}>
            <div style={{width: 130, height: 130, borderRadius: 130, background: 'rgba(124,92,255,0.2)', border: `2px solid ${C.violetLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name="expert" size={70} at={124} /></div>
            <div style={{fontFamily: display, fontWeight: 800, fontSize: 60, color: C.white}}>+</div>
            <div style={{width: 130, height: 130, borderRadius: 36, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name="instagram" size={70} at={132} /></div>
          </div>
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 52, color: C.white, marginTop: 30, letterSpacing: '-0.03em', lineHeight: 1.05}}>Um especialista do meu time<br /><span style={{color: C.violetLight}}>cuidando do seu Instagram</span></div>
          <div style={{display: 'flex', gap: 30, marginTop: 26, fontFamily: body, fontSize: 24, color: C.muted}}>
            <span>◷ 45 minutos</span><span>● ao vivo</span><span>✓ análise individual</span>
          </div>
        </Glass>
      </div>
    </AbsoluteFill>
  );
};
