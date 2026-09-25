import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease} from '../theme';
import {Cursor} from '../ui/Cursor';
import {Glass} from '../ui/Glass';
import {Icon} from '../ui/Icon';
import {Tag} from '../ui/Type';

const FIELDS = [
  {l: 'Seu @ do Instagram', v: '@seuperfil', at: 26},
  {l: 'Nicho / área de atuação', v: 'Serviços profissionais', at: 42},
  {l: 'Objetivo principal', v: 'Vender pelo Instagram', at: 58},
  {l: 'Maior dificuldade hoje', v: 'Não sei o que postar', at: 74},
];

const Typed: React.FC<{v: string; at: number}> = ({v, at}) => {
  const f = useCurrentFrame();
  const n = Math.floor(interpolate(f, [at, at + 14], [0, v.length], clamp));
  const caret = f >= at - 4 && f < at + 20 && Math.floor(f / 6) % 2 === 0;
  return <span>{v.slice(0, n)}<span style={{opacity: caret ? 1 : 0, color: C.violetLight}}>|</span></span>;
};

/** Formulário rápido pré-call. Starts at output 2997 (camera on the right). */
export const S16_Formulario: React.FC = () => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 16], [0, 1], {...clamp, easing: ease.out});
  const sent = interpolate(f, [100, 108], [0, 1], {...clamp, easing: ease.back});
  const o = interpolate(f, [112, 120], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(7,6,12,0.95) 0%, rgba(7,6,12,0.8) 55%, rgba(7,6,12,0) 64%)'}} />
      <div style={{position: 'absolute', left: 110, top: 80, width: 940, opacity: p, translate: `0 ${(1 - p) * 60}px`}}>
        <Tag at={2}>ANTES DA CALL</Tag>
        <Glass style={{marginTop: 20, padding: 40}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <Icon name="form" size={52} at={6} />
            <div style={{fontFamily: display, fontWeight: 800, fontSize: 48, color: C.white}}>Formulário rápido</div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 28}}>
            {FIELDS.map((fl) => {
              const active = f >= fl.at - 4 && f < fl.at + 16;
              return (
                <div key={fl.l}>
                  <div style={{fontFamily: body, fontSize: 20, color: C.muted, marginBottom: 8}}>{fl.l}</div>
                  <div style={{padding: '16px 22px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${active ? C.violetLight : C.lineSoft}`, fontFamily: body, fontWeight: 600, fontSize: 28, color: C.white, minHeight: 36, boxShadow: active ? `0 0 24px -6px ${C.violet}` : undefined}}>
                    <Typed v={fl.v} at={fl.at} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop: 28, padding: '20px 0', borderRadius: 16, textAlign: 'center', background: sent > 0 ? C.mint : C.violet, color: sent > 0 ? C.bg : C.white, fontFamily: display, fontWeight: 800, fontSize: 30, letterSpacing: '0.04em'}}>
            {sent > 0 ? <span style={{display: 'inline-block', scale: String(sent)}}>ENVIADO ✓</span> : 'ENVIAR'}
          </div>
        </Glass>
      </div>
      <Cursor path={[{f: 84, x: 900, y: 700}, {f: 98, x: 560, y: 945}, {f: 110, x: 560, y: 945}]} clicks={[99]} />
    </AbsoluteFill>
  );
};
