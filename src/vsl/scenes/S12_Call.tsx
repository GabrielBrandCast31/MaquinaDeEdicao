import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {Cursor} from '../ui/Cursor';
import {Icon} from '../ui/Icon';
import {IGProfile} from '../ui/Instagram';
import {Shell} from '../ui/Shell';
import {LiveDot} from './S11_Solucao';

const Tile: React.FC<{label: string; icon: 'profile' | 'expert'; at: number; color: string; speaking?: boolean}> = ({label, icon, at, color, speaking}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 14], [0, 1], {...clamp, easing: ease.back});
  const talk = speaking ? 0.5 + 0.5 * Math.abs(Math.sin(f / 4)) : 0;
  return (
    <div style={{width: 300, height: 220, borderRadius: 22, background: `linear-gradient(160deg, ${color}30, #120f1d)`, border: `2px solid ${speaking ? color : C.lineSoft}`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', scale: String(p), opacity: p, boxShadow: speaking ? `0 0 ${30 + talk * 30}px -6px ${color}` : undefined}}>
      <div style={{width: 110, height: 110, borderRadius: 110, background: `${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon name={icon} size={60} color={color} at={at + 4} glow={false} />
      </div>
      <div style={{position: 'absolute', left: 14, bottom: 12, padding: '6px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.55)', fontFamily: display, fontWeight: 700, fontSize: 20, color: C.white, letterSpacing: '0.06em'}}>{label}</div>
    </div>
  );
};

/** Videochamada: você + especialista + seu Instagram na tela. Starts at output 2186. */
export const S12_Call: React.FC = () => {
  const f = useCurrentFrame();
  const win = interpolate(f, [0, 18], [0, 1], {...clamp, easing: ease.out});
  const share = interpolate(f, [108, 128], [0, 1], {...clamp, easing: ease.out});
  const secs = 45 * 60 - Math.max(0, Math.floor((f - 6) / 30));
  const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, '0');
  return (
    <Shell bg tin="rise" tout="depth" din={16}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{width: 1640, height: 900, borderRadius: 34, background: 'rgba(10,8,18,0.92)', border: `1px solid ${C.line}`, boxShadow: '0 60px 160px -40px rgba(0,0,0,0.9)', opacity: win, scale: String(0.94 + win * 0.06), overflow: 'hidden', position: 'relative'}}>
          <div style={{height: 76, display: 'flex', alignItems: 'center', gap: 18, padding: '0 30px', borderBottom: `1px solid ${C.lineSoft}`}}>
            <LiveDot />
            <span style={{fontFamily: display, fontWeight: 700, fontSize: 26, color: C.white}}>Análise de Perfil — ao vivo</span>
            <div style={{flex: 1}} />
            <span style={{fontFamily: mono, fontSize: 26, color: C.violetLight, padding: '8px 16px', borderRadius: 10, background: 'rgba(124,92,255,0.14)'}}>{mm}:{ss}</span>
          </div>
          <div style={{position: 'absolute', left: 30, top: 110, display: 'flex', flexDirection: 'column', gap: 24}}>
            <Tile label="VOCÊ" icon="profile" at={16} color={C.mint} speaking={f > 150 && f % 60 < 30} />
            <Tile label="ESPECIALISTA" icon="expert" at={58} color={C.violetLight} speaking={f > 70 && (f < 150 || f % 60 >= 30)} />
          </div>
          <div style={{position: 'absolute', left: 370, top: 110, right: 30, bottom: 110, borderRadius: 24, background: '#07060C', border: `1px solid ${C.lineSoft}`, overflow: 'hidden'}}>
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 18, opacity: 1 - share}}>
              <Icon name="instagram" size={90} at={20} />
              <div style={{fontFamily: mono, fontSize: 24, color: C.muted, letterSpacing: '0.2em'}}>AGUARDANDO TELA…</div>
            </div>
            <div style={{position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', justifyContent: 'center', opacity: share, translate: `0 ${(1 - share) * 200}px`}}>
              <div style={{scale: '0.9', transformOrigin: 'top center', marginTop: 24}}>
                <IGProfile at={110} />
              </div>
            </div>
            <div style={{position: 'absolute', left: 24, top: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 10, background: 'rgba(77,240,192,0.16)', fontFamily: mono, fontSize: 18, color: C.mint, opacity: share}}>
              <Icon name="eye" size={20} color={C.mint} glow={false} idle={false} /> COMPARTILHANDO TELA
            </div>
            <div style={{position: 'absolute', right: 30, bottom: 24, fontFamily: display, fontWeight: 800, fontSize: 44, color: C.white, opacity: share}}>SEU INSTAGRAM</div>
            <Cursor path={[{f: 132, x: 900, y: 600}, {f: 150, x: 640, y: 250}, {f: 168, x: 600, y: 330}, {f: 186, x: 700, y: 560}]} clicks={[152, 170]} />
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20}}>
            {['video', 'comment', 'share'].map((n) => (
              <div key={n} style={{width: 60, height: 60, borderRadius: 60, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name={n as 'video'} size={28} color={C.white} glow={false} idle={false} /></div>
            ))}
            <div style={{fontFamily: body, fontSize: 20, color: C.muted, marginLeft: 20}}>45 min · 1 especialista · 1 perfil</div>
          </div>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};
