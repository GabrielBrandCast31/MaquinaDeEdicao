import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {pop} from '../ui/anim';
import {Icon} from '../ui/Icon';
import {Notif} from '../ui/Instagram';
import {Kinetic, Tag} from '../ui/Type';
import {Shell} from '../ui/Shell';

const STEPS = [
  {f: 83, v: '0'},
  {f: 94, v: '1.000'},
  {f: 102, v: '10.000'},
  {f: 110, v: '100.000'},
  {f: 118, v: '1.000.000+'},
];

/** "o método que eu usei pra sair do zero e chegar em mais de milhões de visualizações". Starts at output 685. */
export const S04_Milhoes: React.FC = () => {
  const f = useCurrentFrame();
  let idx = -1;
  STEPS.forEach((s, i) => (f >= s.f ? (idx = i) : null));
  const cur = idx >= 0 ? STEPS[idx] : null;
  const pk = cur ? pop(f, cur.f, 30, 10, 0.5) : 0;
  const intro = interpolate(f, [72, 84], [1, 0], {...clamp, easing: ease.in});
  const g = interpolate(f, [83, 150], [0, 1], {...clamp, easing: ease.inOut});
  const W = 1920, H = 520;
  const pts = new Array(40).fill(0).map((_, i) => {
    const t = i / 39;
    return [t * W, H - Math.pow(t, 2.6) * (H - 40) - Math.sin(i * 1.3) * 6 * t];
  });
  const vis = Math.max(2, Math.floor(g * pts.length));
  const d = pts.slice(0, vis).map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const last = pts[vis - 1];
  return (
    <Shell bg tin="depth" tout="zoom">
      {/* intro line */}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: intro}}>
        <Tag at={30}>O MÉTODO QUE EU USEI</Tag>
        <div style={{height: 30}} />
        <Kinetic text="PARA SAIR DO ZERO" at={62} size={130} hl={['ZERO']} />
      </AbsoluteFill>
      {/* chart */}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, bottom: 0, opacity: g > 0 ? 1 : 0}}>
        <defs>
          <linearGradient id="mf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.violet} stopOpacity="0.45" /><stop offset="1" stopColor={C.violet} stopOpacity="0" /></linearGradient>
        </defs>
        <path d={`${d} L${last[0]},${H} L0,${H} Z`} fill="url(#mf)" />
        <path d={d} stroke={C.violetLight} strokeWidth="6" fill="none" strokeLinecap="round" style={{filter: `drop-shadow(0 0 18px ${C.violet})`}} />
        <circle cx={last[0]} cy={last[1]} r="12" fill={C.white} style={{filter: `drop-shadow(0 0 20px ${C.violetLight})`}} />
      </svg>
      {/* counter */}
      {cur ? (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingBottom: 160}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, fontFamily: mono, fontSize: 28, letterSpacing: '0.2em', color: C.muted, marginBottom: 10}}>
            <Icon name="eye" size={40} at={83} /> VISUALIZAÇÕES
          </div>
          <div style={{fontFamily: display, fontWeight: 800, fontSize: cur.v.length > 8 ? 200 : 240, lineHeight: 1, letterSpacing: '-0.05em', color: C.white, scale: String(0.85 + pk * 0.15), textShadow: `0 0 80px ${C.glow}`, fontVariantNumeric: 'tabular-nums'}}>
            {cur.v}
          </div>
          <div style={{fontFamily: body, fontWeight: 600, fontSize: 34, color: C.violetLight, marginTop: 10, opacity: interpolate(f, [120, 132], [0, 1], clamp)}}>mais de milhões de visualizações</div>
        </AbsoluteFill>
      ) : null}
      <Notif icon="eye" text="+1.000 visualizações" at={96} x={160} y={150} color={C.violet} />
      <Notif icon="heart" text="Novas curtidas" at={104} x={1450} y={130} />
      <Notif icon="users" text="Novos seguidores" at={112} x={1480} y={260} color={C.mint} />
      <Notif icon="share" text="Compartilhado" at={122} x={200} y={280} color={C.amber} />
    </Shell>
  );
};

/** "Ele funciona e eu uso ele todos os dias." — small side overlay over the camera. Starts at output 850. */
export const S04b_UsoDiario: React.FC = () => {
  const f = useCurrentFrame();
  const days = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const o = Math.min(interpolate(f, [0, 12], [0, 1], clamp), interpolate(f, [82, 94], [1, 0], clamp));
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 110, top: 380, padding: 34, borderRadius: 28, background: 'rgba(12,10,22,0.78)', border: `1px solid ${C.line}`, width: 520}}>
        <Tag at={4} color={C.mint}>ELE FUNCIONA</Tag>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 52, color: C.white, marginTop: 20, letterSpacing: '-0.03em'}}>USO TODOS<br />OS DIAS</div>
        <div style={{display: 'flex', gap: 10, marginTop: 24}}>
          {days.map((d, i) => {
            const p = interpolate(f, [52 + i * 4, 60 + i * 4], [0, 1], {...clamp, easing: ease.back});
            return (
              <div key={i} style={{width: 56, height: 64, borderRadius: 14, background: `rgba(77,240,192,${0.08 + p * 0.18})`, border: `1px solid ${C.mint}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 16, color: C.muted}}>
                {d}
                <svg width="22" height="22" viewBox="0 0 24 24" style={{scale: String(p)}}><path d="M4 12.5l5 5L20 6.5" stroke={C.mint} strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
