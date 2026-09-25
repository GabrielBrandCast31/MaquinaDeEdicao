import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease} from '../theme';
import {Icon} from './Icon';
import {rand} from './anim';

const tileGrad = (i: number) => {
  const h = [262, 280, 250, 300, 230, 270, 290, 245, 260][i % 9];
  return `linear-gradient(${120 + rand(i) * 120}deg, hsl(${h} 60% ${22 + rand(i + 2) * 18}%), hsl(${h + 30} 70% ${12 + rand(i + 4) * 10}%))`;
};

/** Fictional Instagram profile, drawn as a premium UI card. `reveal` staggers sections from `at`. */
export const IGProfile: React.FC<{at?: number; handle?: string; followers?: string; posts?: string; following?: string; width?: number; bio?: string[]; highlight?: 'bio' | 'feed' | 'reels' | 'stats' | null; niche?: string}> = ({
  at = 0, handle = '@seuperfil', followers = '1.284', posts = '87', following = '412', width = 620, bio = ['Especialista em resultados', 'Ajudo pessoas a crescer 🚀', 'link.bio/agenda'], highlight = null, niche,
}) => {
  const f = useCurrentFrame();
  const r = (d: number) => interpolate(f, [at + d, at + d + 14], [0, 1], {...clamp, easing: ease.out});
  const dim = (k: string) => (highlight && highlight !== k ? 0.35 : 1);
  return (
    <div style={{width, background: '#0B0A12', borderRadius: 36, border: `1px solid ${C.lineSoft}`, padding: 34, fontFamily: body, color: C.white, boxShadow: '0 50px 140px -30px rgba(0,0,0,0.9)'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: r(0), marginBottom: 26}}>
        <div style={{fontWeight: 700, fontSize: 26}}>{handle}</div>
        <Icon name="instagram" size={34} color={C.white} at={at} glow={false} idle={false} />
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 34, opacity: Math.min(r(4), dim('stats'))}}>
        <div style={{width: 120, height: 120, borderRadius: '50%', padding: 4, background: 'conic-gradient(from 200deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5, #FEDA75)'}}>
          <div style={{width: '100%', height: '100%', borderRadius: '50%', background: '#1b1830', border: '4px solid #0B0A12', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon name={niche === 'dentista' ? 'tooth' : niche === 'consultor' ? 'briefcase' : 'profile'} size={54} color={C.violetLight} at={at + 4} glow={false} />
          </div>
        </div>
        {[[posts, 'posts'], [followers, 'seguidores'], [following, 'seguindo']].map(([n, l]) => (
          <div key={l} style={{textAlign: 'center', flex: 1}}>
            <div style={{fontFamily: display, fontWeight: 700, fontSize: 32}}>{n}</div>
            <div style={{fontSize: 18, color: C.muted}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop: 22, fontSize: 20, lineHeight: 1.45, opacity: Math.min(r(8), dim('bio'))}}>
        {bio.map((b, i) => <div key={i} style={{color: i === bio.length - 1 ? '#8FB4FF' : i === 0 ? C.white : C.muted, fontWeight: i === 0 ? 600 : 400}}>{b}</div>)}
      </div>
      <div style={{display: 'flex', gap: 12, marginTop: 20, opacity: r(10)}}>
        {['Seguir', 'Mensagem'].map((b, i) => <div key={b} style={{flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: 12, background: i === 0 ? C.violet : 'rgba(255,255,255,0.08)', fontWeight: 600, fontSize: 18}}>{b}</div>)}
      </div>
      <div style={{display: 'flex', justifyContent: 'space-around', marginTop: 24, paddingTop: 14, borderTop: `1px solid ${C.lineSoft}`, opacity: r(12)}}>
        <div style={{opacity: dim('feed')}}><Icon name="grid" size={28} color={C.white} glow={false} idle={false} /></div>
        <div style={{opacity: dim('reels')}}><Icon name="play" size={28} color={C.white} glow={false} idle={false} /></div>
        <Icon name="profile" size={28} color={C.muted} glow={false} idle={false} />
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 12}}>
        {new Array(9).fill(0).map((_, i) => {
          const p = r(14 + i * 1.5);
          const isReel = i % 3 === 1;
          return (
            <div key={i} style={{aspectRatio: '1 / 1.25', background: tileGrad(i), borderRadius: 6, opacity: p * (isReel ? dim('reels') : dim('feed')), scale: String(0.85 + p * 0.15), position: 'relative'}}>
              {isReel ? <div style={{position: 'absolute', left: 10, bottom: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600}}><Icon name="play" size={14} color="white" glow={false} idle={false} />{(Math.round(rand(i) * 90) / 10 + 0.4).toFixed(1)}k</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Phone frame with rounded bezel. */
export const Phone: React.FC<{children: React.ReactNode; width?: number; style?: React.CSSProperties}> = ({children, width = 420, style}) => (
  <div style={{width, height: width * 2.05, borderRadius: width * 0.14, padding: width * 0.035, background: 'linear-gradient(145deg, #2a2640, #0c0a14)', boxShadow: '0 60px 140px -30px rgba(0,0,0,0.9), inset 0 0 0 2px rgba(255,255,255,0.08)', ...style}}>
    <div style={{width: '100%', height: '100%', borderRadius: width * 0.11, overflow: 'hidden', background: '#07060C', position: 'relative'}}>
      {children}
      <div style={{position: 'absolute', top: 14, left: '50%', translate: '-50% 0', width: width * 0.3, height: 28, borderRadius: 20, background: '#000'}} />
    </div>
  </div>
);

/** Floating social notification pill. */
export const Notif: React.FC<{icon: 'heart' | 'users' | 'comment' | 'eye' | 'share'; text: string; at: number; x: number; y: number; color?: string}> = ({icon, text, at, x, y, color = C.coral}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 14], [0, 1], {...clamp, easing: ease.back});
  const fl = interpolate(f, [at, at + 90], [0, -40], clamp);
  return (
    <div style={{position: 'absolute', left: x, top: y + fl, scale: String(p), opacity: p, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px 14px 14px', background: 'rgba(20,16,34,0.9)', border: `1px solid ${C.lineSoft}`, borderRadius: 999, fontFamily: body, fontWeight: 600, fontSize: 22, color: C.white, boxShadow: '0 20px 50px -10px rgba(0,0,0,0.7)'}}>
      <div style={{width: 40, height: 40, borderRadius: 40, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} size={22} color="white" glow={false} idle={false} /></div>
      {text}
    </div>
  );
};
