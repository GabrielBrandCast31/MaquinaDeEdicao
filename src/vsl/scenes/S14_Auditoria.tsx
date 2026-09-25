import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {body, C, clamp, display, ease, mono} from '../theme';
import {Icon, IconName} from '../ui/Icon';
import {IGProfile} from '../ui/Instagram';
import {Tag} from '../ui/Type';
import {Shell} from '../ui/Shell';

const STEPS: {t: string; d: string; at: number; icon: IconName; bad?: boolean}[] = [
  {t: 'BIO', d: 'proposta clara?', at: 27, icon: 'bio'},
  {t: 'FEED', d: 'padrão e posicionamento', at: 43, icon: 'grid'},
  {t: 'REELS', d: 'ganchos e formato', at: 64, icon: 'play'},
  {t: 'CONTEÚDOS', d: 'últimas publicações', at: 79, icon: 'video'},
  {t: 'ALCANCE', d: 'o que está segurando', at: 140, icon: 'eye', bad: true},
  {t: 'RETENÇÃO', d: 'onde as pessoas saem', at: 163, icon: 'retention', bad: true},
];

const Draw: React.FC<{at: number; d: string; color?: string}> = ({at, d, color = C.amber}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 14], [0, 1], {...clamp, easing: ease.out});
  return <path d={d} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} style={{filter: `drop-shadow(0 0 10px ${color})`}} />;
};

/** Auditoria: bio → feed → reels → conteúdos → alcance → retenção. Starts at output 2582 (camera = bubble). */
export const S14_Auditoria: React.FC = () => {
  const f = useCurrentFrame();
  const hl = f >= 140 ? 'stats' : f >= 64 ? 'reels' : f >= 43 ? 'feed' : f >= 27 ? 'bio' : null;
  const zoom = interpolate(f, [22, 34, 40, 50, 60, 72, 132, 146], [1, 1.06, 1.06, 1.02, 1.02, 1.04, 1.04, 1], {...clamp, easing: ease.inOut});
  const scan = (f * 9) % 960;
  const meter = interpolate(f, [146, 180], [0, 1], {...clamp, easing: ease.out});
  return (
    <Shell bg tin="blur" tout="whipL">
      <div style={{position: 'absolute', left: 300, top: 90, scale: String(0.75 * zoom), transformOrigin: '0 0'}}>
        <IGProfile at={0} highlight={hl as 'bio'} handle="@seuperfil" />
      </div>
      <div style={{position: 'absolute', left: 300, top: 90 + scan, width: 465, height: 2, background: `linear-gradient(90deg, transparent, ${C.violetLight}, transparent)`, opacity: f < 136 ? 0.6 : 0}} />
      <svg width="1920" height="1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <Draw at={27} d="M300 300 C 300 250, 780 250, 780 300 C 780 352, 300 352, 300 300" />
        <Draw at={43} d="M318 440 H 750 V 962 H 318 Z" color={C.violetLight} />
        <Draw at={64} d="M534 530 m -62 0 a 62 80 0 1 0 124 0 a 62 80 0 1 0 -124 0" color={C.coral} />
        <Draw at={70} d="M534 700 m -62 0 a 62 80 0 1 0 124 0 a 62 80 0 1 0 -124 0" color={C.coral} />
        <Draw at={140} d="M760 200 C 820 200, 840 240, 870 250" color={C.coral} />
      </svg>
      <div style={{position: 'absolute', left: 890, top: 80, width: 620}}>
        <Tag at={4}>AUDITORIA AO VIVO</Tag>
        <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24}}>
          {STEPS.map((s) => {
            const p = interpolate(f, [s.at, s.at + 12], [0, 1], {...clamp, easing: ease.out});
            const col = s.bad ? C.coral : C.violetLight;
            return (
              <div key={s.t} style={{display: 'flex', alignItems: 'center', gap: 18, padding: '14px 20px', borderRadius: 16, background: p > 0 ? `linear-gradient(90deg, ${col}22, rgba(255,255,255,0.02))` : 'rgba(255,255,255,0.03)', border: `1px solid ${p > 0 ? `${col}55` : C.lineSoft}`, opacity: 0.35 + p * 0.65, translate: `${(1 - p) * 20}px 0`}}>
                <Icon name={s.icon} size={34} color={col} at={s.at} glow={false} />
                <div style={{fontFamily: display, fontWeight: 800, fontSize: 32, color: C.white, width: 220}}>{s.t}</div>
                <div style={{fontFamily: body, fontSize: 20, color: C.muted, flex: 1}}>{s.d}</div>
                {s.bad ? <Icon name="alert" size={28} color={C.coral} at={s.at + 6} glow={false} /> : <Icon name="check" size={28} color={C.mint} at={s.at + 6} glow={false} idle={false} />}
              </div>
            );
          })}
        </div>
        <div style={{marginTop: 24, padding: 24, borderRadius: 20, background: 'rgba(255,90,106,0.1)', border: `1px solid ${C.coral}66`, opacity: meter, translate: `0 ${(1 - meter) * 20}px`, width: 620}}>
          <div style={{fontFamily: mono, fontSize: 18, color: C.coral, letterSpacing: '0.2em'}}>DIAGNÓSTICO</div>
          <div style={{fontFamily: display, fontWeight: 700, fontSize: 30, color: C.white, marginTop: 8}}>O que está segurando o seu alcance agora</div>
          <div style={{height: 12, borderRadius: 12, background: 'rgba(255,255,255,0.08)', marginTop: 16, overflow: 'hidden'}}>
            <div style={{width: `${meter * 38}%`, height: '100%', background: `linear-gradient(90deg, ${C.coral}, ${C.amber})`}} />
          </div>
        </div>
      </div>
    </Shell>
  );
};
