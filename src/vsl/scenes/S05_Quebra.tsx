import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, display, ease} from '../theme';
import {rand} from '../ui/anim';
import {Icon} from '../ui/Icon';
import {Kinetic} from '../ui/Type';

/** "O método é o mesmo pra todo mundo. O seu perfil não é." Starts at output 1055. */
export const S05_Quebra: React.FC = () => {
  const f = useCurrentFrame();
  const a = Math.min(interpolate(f, [0, 8], [0, 1], clamp), interpolate(f, [68, 76], [1, 0], clamp));
  const black = interpolate(f, [70, 78], [0, 1], clamp);
  const big = interpolate(f, [76, 84], [1.35, 1], {...clamp, easing: ease.out});
  const nao = interpolate(f, [97, 104], [0, 1], {...clamp, easing: ease.back});
  const shake = f >= 97 && f < 105 ? (rand(f) - 0.5) * 18 : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: a}}>
        <Kinetic text="O MÉTODO É O MESMO." at={0} stagger={5} size={120} hl={['MESMO']} />
        <div style={{display: 'flex', gap: 22, marginTop: 50}}>
          {new Array(9).fill(0).map((_, i) => (
            <div key={i} style={{opacity: interpolate(f, [34 + i * 2, 42 + i * 2], [0, 0.85], clamp)}}>
              <Icon name="profile" size={58} color={C.muted} at={34 + i * 2} glow={false} />
            </div>
          ))}
        </div>
        <div style={{fontFamily: display, fontSize: 30, color: C.muted, marginTop: 16, opacity: interpolate(f, [36, 48], [0, 1], clamp), letterSpacing: '0.1em'}}>PARA TODO MUNDO</div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: C.bg, opacity: black, justifyContent: 'center', alignItems: 'center'}}>
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(50% 50% at 50% 50%, ${C.glow} 0%, transparent 70%)`, opacity: nao * 0.5}} />
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 230, lineHeight: 0.92, letterSpacing: '-0.055em', color: C.white, textAlign: 'center', scale: String(big), translate: `${shake}px 0`}}>
          O SEU PERFIL<br />
          <span style={{color: C.violetLight, opacity: nao, display: 'inline-block', scale: String(0.6 + nao * 0.4), textShadow: `0 0 80px ${C.glow}`}}>NÃO É.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
