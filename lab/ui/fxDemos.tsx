// Visual-effect demos for the Biblioteca: each one is a tiny synthetic EditSpec rendered by the real
// LabEdit composition, so what you see here is exactly what the renderer produces.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {clamp, ease, pop, progress, Sfx, Text, useExit} from '../../src/lab/motionKit';
import type {CamMode, EditSpec, MotionScene, SceneProps, SfxName, StyleProfile} from '../../src/lab/types';
import type {Footage} from './api';

export const DEMO_FPS = 30;
export const DEMO_FRAMES = 150;
export type DemoAspect = '9:16' | '16:9';

type DeepPartial<T> = {[K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K]};
const merge = <T,>(a: T, b: DeepPartial<T> | undefined): T => {
  if (!b) return a;
  const out = {...a} as Record<string, unknown>;
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' ? merge(cur as Record<string, unknown>, v as Record<string, unknown>) : v;
  }
  return out as T;
};

export type Demo = {
  id: string;
  group: string;
  title: string;
  desc: string;
  /** Where to turn it on in the Lab. */
  where: string;
  style?: DeepPartial<StyleProfile>;
  punches?: boolean;
  callout?: boolean;
  /** One continuous shot instead of three jump cuts. */
  oneClip?: boolean;
  scenes?: MotionScene[];
};

// ---------- demo motion scenes (camera modes) ----------
const Card: React.FC<SceneProps & {mode: CamMode}> = ({durationInFrames, width: W, height: H, fps, style, mode}) => {
  const f = useCurrentFrame();
  const out = useExit(durationInFrames);
  const wide = W > H;
  // Area the camera window leaves free.
  const area = mode === 'bubble' || mode === 'hidden' ? {x: 0.08, y: 0.18, w: 0.84, h: 0.55}
    : wide ? (mode === 'pip-right' ? {x: 0.05, y: 0.15, w: 0.52, h: 0.7} : mode === 'pip-left' ? {x: 0.43, y: 0.15, w: 0.52, h: 0.7} : {x: 0.1, y: 0.52, w: 0.8, h: 0.42})
    : mode === 'pip-top' ? {x: 0.07, y: 0.5, w: 0.86, h: 0.42} : {x: 0.07, y: 0.08, w: 0.86, h: 0.44};
  const u = Math.min(W * area.w, H * area.h);
  const n = Math.round(interpolate(f, [4, 34], [0, 3], {...clamp, easing: ease.out}));
  const accent = style.captions.highlightColor;
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 30% 20%, #2a2140 0%, #111018 55%, #07070b 100%)`, opacity: out}}>
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: `${W / 18}px ${W / 18}px`}} />
      <div style={{position: 'absolute', left: W * area.x, top: H * area.y, width: W * area.w, height: H * area.h, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: u * 0.05}}>
        <Text font="Inter" weight={700} size={u * 0.07} color="rgba(255,255,255,0.6)" style={{letterSpacing: '0.2em', opacity: progress(f, 0, 8)}}>O MÉTODO</Text>
        <Text font="Anton" size={u * 0.26} color="#fff" style={{scale: String(0.7 + 0.3 * pop(f, fps, 2)), transformOrigin: 'left center'}}>
          <span style={{color: accent}}>{n}</span> PASSOS
        </Text>
        {[0, 1, 2].map((i) => {
          const p = progress(f, 14 + i * 8, 30 + i * 8);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: u * 0.04, opacity: p, translate: `${(1 - p) * -u * 0.1}px 0`}}>
              <div style={{width: u * 0.07, height: u * 0.07, borderRadius: '50%', background: accent, display: 'grid', placeItems: 'center', color: '#000', fontWeight: 900, fontSize: u * 0.045, fontFamily: 'sans-serif'}}>{i + 1}</div>
              <div style={{height: u * 0.035, width: `${(0.45 + i * 0.12) * 100}%`, borderRadius: u, background: 'rgba(255,255,255,0.16)'}} />
            </div>
          );
        })}
      </div>
      <Sfx at={0} name="whoosh" />
      {[0, 1, 2].map((i) => <Sfx key={i} at={14 + i * 8} name="blip" volume={0.35} />)}
    </AbsoluteFill>
  );
};
const cardScene = (mode: CamMode): MotionScene[] => [{
  id: `demo-${mode}`, startWord: 2, endWord: 9, layer: 'full', camera: mode, hideCaptions: true,
  Component: (p: SceneProps) => <Card {...p} mode={mode} />,
}];

const Counter: React.FC<SceneProps> = ({durationInFrames, width: W, height: H, fps, style}) => {
  const f = useCurrentFrame();
  const out = useExit(durationInFrames);
  const u = Math.min(W, H);
  const v = Math.round(interpolate(f, [0, 30], [0, 300], {...clamp, easing: ease.out}));
  const s = pop(f, fps, 0, 12);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start', paddingTop: H * 0.14, opacity: out}}>
      <div style={{scale: String(s), background: 'rgba(12,12,18,0.72)', border: `${u * 0.004}px solid rgba(255,255,255,0.18)`, borderRadius: u * 0.05, padding: `${u * 0.03}px ${u * 0.06}px`, textAlign: 'center', backdropFilter: 'blur(12px)'}}>
        <Text font="Inter" weight={700} size={u * 0.035} color="rgba(255,255,255,0.7)" style={{letterSpacing: '0.12em'}}>VENDAS NO MÊS</Text>
        <Text font="Anton" size={u * 0.16} color={style.captions.highlightColor}>+{v}%</Text>
      </div>
      <Sfx at={0} name="whoosh-hit" volume={0.4} />
      <Sfx at={30} name="cash" volume={0.45} />
    </AbsoluteFill>
  );
};
const overScene: MotionScene[] = [{id: 'demo-over', startWord: 1, endWord: 7, layer: 'over', Component: Counter}];

// ---------- catalog ----------
const tr = (id: string, title: string, type: StyleProfile['transitions']['type'], sfx: SfxName | null, desc: string): Demo => ({
  id, group: 'Transições', title, desc, where: `Ajustes → Transições → Tipo: ${title}${sfx ? ` · Áudio → SFX nas transições: ${sfx}` : ''}`,
  style: {transitions: {type, every: 1}, audio: {sfx: {onCut: sfx}}},
});
const cap = (id: string, title: string, style: DeepPartial<StyleProfile['captions']>, desc: string, where: string): Demo => ({
  id, group: 'Legendas', title, desc, where: `Ajustes → Legendas → ${where}`, style: {captions: style},
});
const co = (id: string, title: string, s: StyleProfile['callouts']['style'], desc: string): Demo => ({
  id, group: 'Textos de destaque', title, desc, where: `Ajustes → Textos de destaque → Formato: ${title}. A IA escolhe o texto e o momento no plano`,
  callout: true, style: {callouts: {enabled: true, style: s}},
});
const grade = (id: string, title: string, g: DeepPartial<StyleProfile['grade']>, desc: string): Demo => ({
  id, group: 'Cor', title, desc, where: 'Ajustes → Cor', oneClip: true,
  style: {grade: {contrast: 1, saturation: 1, brightness: 1, warmth: 0, vignette: 0, grain: 0, ...g}},
});
const mo = (id: string, title: string, mode: CamMode, desc: string): Demo => ({
  id, group: 'Motion e câmera em janela', title, desc, scenes: cardScene(mode),
  where: `A IA de motion escolhe por cena (camera: '${mode}'). Peça no prompt de motion, ex: "tela cheia com a câmera em janela quando eu citar números"`,
});

export const DEMOS: Demo[] = [
  tr('tr-none', 'Corte seco', 'none', null, 'Jump cut puro, sem efeito. O mais comum em talking head.'),
  tr('tr-flash', 'Flash', 'flash', 'whoosh', 'Clarão branco de poucos quadros no corte.'),
  tr('tr-whip', 'Chicote', 'whip', 'whip', 'Borrão lateral como se a câmera girasse rápido.'),
  tr('tr-zoom', 'Zoom blur', 'zoom-blur', 'swipe', 'Zoom rápido com desfoque atravessando o corte.'),
  tr('tr-glitch', 'Glitch', 'glitch', 'glitch', 'Tremida digital com troca de cor.'),

  cap('cap-pop', 'Pop', {animation: 'pop'}, 'Cada bloco entra crescendo. Padrão do Lab.', 'Animação: Pop'),
  cap('cap-slide', 'Subir', {animation: 'slide-up'}, 'O bloco sobe suavemente para a posição.', 'Animação: Subir'),
  cap('cap-fade', 'Fade', {animation: 'fade'}, 'Aparece por transparência. Discreto, bom para VSL.', 'Animação: Fade'),
  cap('cap-bounce', 'Quicar', {animation: 'bounce'}, 'Entra passando do tamanho e volta, com energia.', 'Animação: Quicar'),
  cap('cap-karaoke', 'Karaokê', {mode: 'karaoke', wordsPerCaption: 4}, 'As palavras surgem conforme são faladas.', 'Modo: Karaokê'),
  cap('cap-word', 'Palavra a palavra', {mode: 'word-by-word', sizePct: 11}, 'Uma palavra por vez, grande. Ritmo de TikTok.', 'Modo: Palavra a palavra'),
  cap('cap-tiktok', 'Caixa na palavra', {activeWordBox: true, highlightColor: '#FF2D55'}, 'Caixa colorida atrás da palavra que está sendo falada.', 'Caixa na palavra destacada'),
  cap('cap-keywords', 'Palavras-chave', {highlight: 'keywords', highlightColor: '#3DDC97'}, 'Só as palavras importantes (a IA escolhe) mudam de cor.', 'Destacar: Palavras-chave'),
  cap('cap-box', 'Caixa de fundo', {box: {enabled: true, opacity: 0.7, radius: 18}, strokeWidth: 0, uppercase: false, font: 'Inter', weight: 700, wordsPerCaption: 4, animation: 'fade', highlight: 'none'}, 'Legenda limpa numa tarja escura, estilo documentário.', 'Caixa de fundo'),

  co('co-bold', 'Grande no centro', 'bold-center', 'Título enorme no meio da tela, escurece o fundo.'),
  co('co-lower', 'Tarja inferior', 'lower-third', 'Faixa lateral na parte de baixo, estilo telejornal.'),
  co('co-sticker', 'Adesivo', 'sticker', 'Etiqueta inclinada colorida no topo.'),

  {id: 'cam-punch', group: 'Câmera', title: 'Punch-in seco', desc: 'Zoom instantâneo numa palavra de ênfase.', where: 'Ajustes → Câmera → Tipo de punch: Seco · a IA escolhe as palavras', punches: true, oneClip: true, style: {camera: {punchStyle: 'cut', punchScale: 1.25, zoomOnCut: 'none'}, audio: {sfx: {onPunch: 'hit'}}}},
  {id: 'cam-smooth', group: 'Câmera', title: 'Punch-in suave', desc: 'O zoom de ênfase entra e sai animado.', where: 'Ajustes → Câmera → Tipo de punch: Suave', punches: true, oneClip: true, style: {camera: {punchStyle: 'smooth', punchScale: 1.25, zoomOnCut: 'none'}, audio: {sfx: {onPunch: 'whoosh'}}}},
  {id: 'cam-shake', group: 'Câmera', title: 'Tremida no punch', desc: 'Pancada de câmera junto com o zoom de ênfase.', where: 'Ajustes → Câmera → Tremida no punch', punches: true, oneClip: true, style: {camera: {punchStyle: 'cut', punchScale: 1.3, shakeOnPunch: true, zoomOnCut: 'none'}, audio: {sfx: {onPunch: 'boom'}}}},
  {id: 'cam-alt', group: 'Câmera', title: 'Zoom alternado', desc: 'A cada corte alterna entre plano aberto e fechado, disfarça o jump cut.', where: 'Ajustes → Câmera → Zoom nos cortes: Alternado', style: {camera: {zoomOnCut: 'alternate', cutZoomScale: 1.22}}},
  {id: 'cam-push', group: 'Câmera', title: 'Zoom lento contínuo', desc: 'Aproximação lenta durante o plano, dá tensão.', where: 'Ajustes → Câmera → Zoom lento contínuo', oneClip: true, style: {camera: {zoomOnCut: 'none', slowPushIn: 0.2}}},

  grade('gr-none', 'Sem correção', {}, 'O vídeo como foi gravado, para comparar.'),
  grade('gr-warm', 'Quente', {warmth: 0.7, contrast: 1.08, saturation: 1.1}, 'Tons alaranjados, acolhedor.'),
  grade('gr-cold', 'Frio', {warmth: -0.6, contrast: 1.1, saturation: 0.9}, 'Tons azulados, tecnológico/sério.'),
  grade('gr-vignette', 'Vinheta', {vignette: 0.85, contrast: 1.05}, 'Bordas escuras que puxam o olhar para o centro.'),
  grade('gr-grain', 'Granulação', {grain: 0.8, contrast: 1.12, saturation: 0.9}, 'Textura de filme.'),
  grade('gr-bw', 'Preto e branco', {saturation: 0, contrast: 1.3, vignette: 0.4}, 'P&B contrastado, dramático.'),

  {id: 'bar-top', group: 'Barra de progresso', title: 'Barra no topo', desc: 'Mostra quanto falta do vídeo, segura a retenção.', where: 'Ajustes → Barra de progresso', oneClip: true, style: {progressBar: {enabled: true, position: 'top'}}},
  {id: 'bar-bottom', group: 'Barra de progresso', title: 'Barra na base', desc: 'A mesma barra, na parte de baixo.', where: 'Ajustes → Barra de progresso → Posição: Base', oneClip: true, style: {progressBar: {enabled: true, position: 'bottom'}}},

  mo('mo-pip-right', 'Janela lateral', 'pip-right', 'Motion em tela cheia e o apresentador numa janela ao lado (embaixo, no vertical).'),
  mo('mo-pip-left', 'Janela à esquerda', 'pip-left', 'Igual à lateral, do outro lado.'),
  mo('mo-pip-top', 'Câmera no topo', 'pip-top', 'O apresentador em cima e o motion embaixo.'),
  mo('mo-bubble', 'Bolinha', 'bubble', 'O apresentador numa bolinha no canto.'),
  {id: 'mo-over', group: 'Motion e câmera em janela', title: 'Sobreposição', desc: 'Card animado por cima do vídeo, sem esconder o apresentador.', where: "A IA de motion usa layer: 'over'. Peça no prompt, ex: \"cards com os números por cima do vídeo\"", scenes: overScene},
];

export const DEMO_GROUPS = [...new Set(DEMOS.map((d) => d.group))];

// ---------- spec builder ----------
const PHRASE = ['Esse', 'é', 'o', 'segredo', 'que', 'ninguém', 'te', 'conta', 'sobre', 'vender', 'todo', 'dia.'];
const KEYWORDS = new Set([3, 9]);

export const buildDemoSpec = (demo: Demo, base: StyleProfile, footage: Footage, aspect: DemoAspect): EditSpec => {
  const style = merge(merge(base, {format: {aspect, fps: DEMO_FPS}, transitions: {type: 'none', every: 0}, callouts: {enabled: false}, audio: {sfx: {onCut: null, onPunch: null, onCallout: 'pop'}, music: {enabled: false}}}), demo.style);
  const [W, H] = aspect === '9:16' ? [1080, 1920] : [1920, 1080];
  const at = (k: number) => Math.round(Math.max(0, footage.duration - 8) * k * DEMO_FPS);
  const clips = demo.oneClip
    ? [{from: 0, dur: DEMO_FRAMES, trimBefore: at(0.4)}]
    : [0.25, 0.5, 0.75].map((k, i) => ({from: i * 50, dur: 50, trimBefore: at(k)}));
  const words = PHRASE.map((t, i) => ({t, f: 8 + i * 11, e: 18 + i * 11, ri: i, ...(KEYWORDS.has(i) && {hl: true})}));
  const cs = style.captions;
  const per = cs.mode === 'word-by-word' ? 1 : Math.max(1, Math.round(cs.wordsPerCaption));
  const captions: EditSpec['captions'] = [];
  for (let i = 0; i < words.length; i += per) {
    const last = Math.min(words.length, i + per) - 1;
    captions.push({a: words[i].f, b: words[last].e + 4, w0: i, w1: last});
  }
  for (let i = 0; i < captions.length - 1; i++) captions[i].b = Math.min(captions[i].b, captions[i + 1].a);
  const hold = Math.round(style.camera.punchHoldSec * DEMO_FPS);
  const punches = demo.punches ? [words[3].f, words[9].f].map((f) => ({f, dur: hold})) : [];
  const transitions = style.transitions.type !== 'none' ? clips.slice(1).map((c) => ({f: c.from})) : [];
  const callouts = demo.callout ? [{f: words[2].f, dur: 80, text: 'VENDER TODO DIA'}] : [];
  const sv = style.audio.sfx;
  const sfx: EditSpec['sfx'] = [
    ...(sv.onCut ? transitions.map((t) => ({f: Math.max(0, t.f - 3), name: sv.onCut!, volume: sv.volume})) : []),
    ...(sv.onPunch ? punches.map((p) => ({f: p.f, name: sv.onPunch!, volume: sv.volume})) : []),
    ...(sv.onCallout ? callouts.map((c) => ({f: c.f, name: sv.onCallout!, volume: sv.volume})) : []),
  ];
  return {
    version: 1, fps: DEMO_FPS, width: W, height: H, durationInFrames: DEMO_FRAMES,
    src: {url: footage.url, width: footage.width, height: footage.height}, subject: {fx: 0.5, fy: 0.38},
    clips, words, captions, punches, callouts, transitions, sfx, music: null, style,
  };
};
