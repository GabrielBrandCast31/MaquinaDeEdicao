import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {pop} from '../ui/anim';
import {Icon} from '../ui/Icon';
import {Notif, Phone} from '../ui/Instagram';
import {Tag} from '../ui/Type';

/** "sai dessa call e publica o primeiro conteúdo com o método no mesmo dia". Output 3804, camera on the right. */
export const S19_Publica: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, 12], [0, 1], clamp), interpolate(f, [164, 174], [1, 0], clamp));
  const prog = interpolate(f, [30, 62], [0, 1], {...clamp, easing: ease.inOut});
  const done = pop(f, 64, 30, 10);
  const same = pop(f, 138, 30, 11);
  const ph = interpolate(f, [0, 20], [0, 1], {...clamp, easing: ease.out});
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(7,6,12,0.95) 0%, rgba(7,6,12,0.8) 55%, rgba(7,6,12,0) 64%)'}} />
      <div style={{position: 'absolute', left: 120, top: 120}}>
        <Tag at={4}>DEPOIS DA CALL</Tag>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 76, lineHeight: 1.02, color: C.white, letterSpacing: '-0.04em', marginTop: 20, width: 520}}>Publica o primeiro conteúdo</div>
        <div style={{marginTop: 30, display: 'inline-flex', alignItems: 'center', gap: 14, padding: '18px 30px', borderRadius: 18, background: C.violet, fontFamily: display, fontWeight: 800, fontSize: 44, color: C.white, scale: String(same), opacity: same, transformOrigin: 'left center', boxShadow: `0 0 60px ${C.glow}`}}>
          <Icon name="calendar" size={40} color="white" glow={false} at={138} /> NO MESMO DIA
        </div>
      </div>
      <div style={{position: 'absolute', left: 680, top: 110, translate: `0 ${(1 - ph) * 120}px`, opacity: ph, rotate: `${-4 + ph * 4}deg`}}>
        <Phone width={410}>
          <div style={{position: 'absolute', inset: 0, padding: '70px 22px 22px', fontFamily: body, color: C.white}}>
            <div style={{fontWeight: 700, fontSize: 22, textAlign: 'center'}}>Novo reel</div>
            <div style={{marginTop: 18, height: 470, borderRadius: 18, background: 'linear-gradient(160deg, #3b2d7a, #120f1f)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'}}>
              <Icon name="play" size={80} color={C.white} glow={false} />
              <div style={{position: 'absolute', left: 16, bottom: 16, fontFamily: mono, fontSize: 16, color: C.white, background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 8}}>gancho em 3s</div>
            </div>
            <div style={{marginTop: 16, fontSize: 18, color: C.muted}}>Legenda com chamada para ação…</div>
            <div style={{marginTop: 22, height: 64, borderRadius: 14, background: done > 0 ? C.mint : C.violet, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24, color: done > 0 ? C.bg : C.white, position: 'relative', overflow: 'hidden'}}>
              {done > 0 ? <span style={{scale: String(done)}}>Publicado ✓</span> : 'Publicando…'}
              {done === 0 ? <div style={{position: 'absolute', left: 0, bottom: 0, height: 5, width: `${prog * 100}%`, background: C.white}} /> : null}
            </div>
          </div>
        </Phone>
      </div>
      <Notif icon="heart" text="Nova curtida" at={74} x={120} y={640} />
      <Notif icon="comment" text="Novo comentário" at={86} x={150} y={740} color={C.violet} />
      <Notif icon="eye" text="Alcançando pessoas" at={98} x={120} y={840} color={C.mint} />
    </AbsoluteFill>
  );
};
