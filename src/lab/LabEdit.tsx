import {Audio, Video} from '@remotion/media';
import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, random, Sequence, useCurrentFrame} from 'remotion';
import {fontFamily} from './fonts';
import {MOTION} from './motion';
import {LabBase} from './motionKit';
import type {CamMode, EditSpec, LabProps, MotionScene, StyleProfile} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const TRANSITION_HALF = 5;

const url = (base: string | undefined, u: string) => (/^https?:/.test(u) ? u : `${base ?? ''}${u}`);

const clipIndexAt = (clips: EditSpec['clips'], f: number) => {
  let lo = 0, hi = clips.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (clips[mid].from <= f) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
};

const punchFactor = (spec: EditSpec, f: number) => {
  const {punchScale, punchStyle} = spec.style.camera;
  const ramp = punchStyle === 'smooth' ? 7 : 0;
  let k = 0;
  for (const p of spec.punches) {
    if (f < p.f - 1 || f > p.f + p.dur + ramp) continue;
    const inT = ramp ? interpolate(f, [p.f, p.f + ramp], [0, 1], {...clamp, easing: easeOut}) : f >= p.f ? 1 : 0;
    const outT = ramp ? interpolate(f, [p.f + p.dur, p.f + p.dur + ramp], [1, 0], clamp) : f < p.f + p.dur ? 1 : 0;
    k = Math.max(k, Math.min(inT, outT));
  }
  return 1 + (punchScale - 1) * k;
};

type Placed = {scene: MotionScene; from: number; dur: number};

/** Resolves AI-written scenes (anchored to raw word indices) onto the output timeline. */
const placeScenes = (spec: EditSpec): Placed[] => {
  const scenes = spec.projectId ? MOTION[spec.projectId] ?? [] : [];
  const out: Placed[] = [];
  for (const scene of scenes) {
    const first = spec.words.find((w) => w.ri >= scene.startWord);
    if (!first) continue;
    let end = first.f + Math.round((scene.durationSec ?? 3) * spec.fps);
    if (scene.endWord !== undefined) {
      const last = [...spec.words].reverse().find((w) => w.ri <= scene.endWord!);
      if (last && last.e > first.f) end = last.e + 4;
    }
    out.push({scene, from: first.f, dur: Math.max(6, Math.min(end, spec.durationInFrames) - first.f)});
  }
  return out.sort((a, b) => a.from - b.from);
};

type Box = {x: number; y: number; w: number; h: number; r: number; o: number};
const camBox = (m: CamMode, W: number, H: number): Box => {
  const u = Math.min(W, H);
  const wide = W > H;
  switch (m) {
    case 'hidden': return {x: W - u * 0.34, y: H - u * 0.34, w: u * 0.28, h: u * 0.28, r: u * 0.14, o: 0};
    case 'bubble': return {x: W - u * 0.34, y: H - u * 0.34 - (wide ? 0 : H * 0.12), w: u * 0.28, h: u * 0.28, r: u * 0.14, o: 1};
    case 'pip-right': return wide ? {x: W * 0.62, y: H * 0.11, w: W * 0.32, h: H * 0.78, r: u * 0.035, o: 1} : {x: W * 0.52, y: H * 0.56, w: W * 0.43, h: W * 0.56, r: u * 0.04, o: 1};
    case 'pip-left': return wide ? {x: W * 0.06, y: H * 0.11, w: W * 0.32, h: H * 0.78, r: u * 0.035, o: 1} : {x: W * 0.05, y: H * 0.56, w: W * 0.43, h: W * 0.56, r: u * 0.04, o: 1};
    case 'pip-top': return wide ? {x: W * 0.35, y: H * 0.06, w: W * 0.3, h: H * 0.42, r: u * 0.035, o: 1} : {x: W * 0.06, y: H * 0.05, w: W * 0.88, h: H * 0.4, r: u * 0.04, o: 1};
    default: return {x: 0, y: 0, w: W, h: H, r: 0, o: 1};
  }
};
const CAM_EASE = 10;
const camAt = (placed: Placed[], f: number, W: number, H: number): Box => {
  // Mode timeline: at every scene boundary the camera follows the most recently started scene still on screen.
  const modeAt = (fr: number): CamMode => {
    const active = placed.filter((p) => (p.scene.layer === 'full' || p.scene.camera) && fr >= p.from && fr < p.from + p.dur).sort((a, b) => b.from - a.from)[0];
    return active ? active.scene.camera ?? (active.scene.layer === 'full' ? 'hidden' : 'full') : 'full';
  };
  const keys: {f: number; m: CamMode}[] = [{f: -999, m: 'full'}];
  for (const e of [...new Set(placed.flatMap((p) => [p.from, p.from + p.dur]))].sort((a, b) => a - b)) {
    const m = modeAt(e);
    if (m !== keys[keys.length - 1].m) keys.push({f: e, m});
  }
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].f <= f) i++;
  const cur = camBox(keys[i].m, W, H), prev = camBox(keys[Math.max(0, i - 1)].m, W, H);
  const t = interpolate(f, [keys[i].f, keys[i].f + CAM_EASE], [0, 1], {...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1)});
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {x: lerp(prev.x, cur.x), y: lerp(prev.y, cur.y), w: lerp(prev.w, cur.w), h: lerp(prev.h, cur.h), r: lerp(prev.r, cur.r), o: lerp(prev.o, cur.o)};
};

/** Talking-head footage framed for the output aspect, with zooms, punches and cut transitions. */
const Frame: React.FC<{spec: EditSpec; base?: string; placed: Placed[]}> = ({spec, base, placed}) => {
  const f = useCurrentFrame();
  const {width: W, height: H, src, style} = spec;
  const box = camAt(placed, f, W, H);
  const cam = style.camera;
  const ci = clipIndexAt(spec.clips, f);
  const clip = spec.clips[ci];
  const cutZoom = cam.zoomOnCut === 'alternate' ? (ci % 2 ? cam.cutZoomScale : 1) : cam.zoomOnCut === 'random' ? 1 + (cam.cutZoomScale - 1) * random(`cut-${ci}`) : 1;
  const push = 1 + cam.slowPushIn * Math.max(0, f - (clip?.from ?? 0)) / (10 * spec.fps);
  let zoom = cam.baseZoom * cutZoom * push * punchFactor(spec, f);

  let dx = 0, blur = 0, hue = 0;
  // shake right after a punch-in
  if (cam.shakeOnPunch) {
    const p = spec.punches.find((q) => f >= q.f && f < q.f + 10);
    if (p) { const k = f - p.f; dx += Math.sin(k * 2.4) * (W * 0.012) * (1 - k / 10); }
  }
  const tr = style.transitions.type;
  const near = spec.transitions.find((t) => Math.abs(f - t.f) <= TRANSITION_HALF);
  if (near && tr !== 'none' && tr !== 'flash') {
    const d = f - near.f;
    const k = 1 - Math.abs(d) / (TRANSITION_HALF + 1);
    if (tr === 'whip') { dx += (d < 0 ? -1 : 1) * -W * 0.18 * k; blur += 28 * k; }
    if (tr === 'zoom-blur') { zoom *= 1 + 0.22 * k; blur += 14 * k; }
    if (tr === 'glitch') { dx += (random(`g-${f}`) - 0.5) * W * 0.06 * k; hue = 120 * k * (random(`h-${f}`) > 0.5 ? 1 : -1); }
  }

  const bw = box.w, bh = box.h;
  const s = Math.max(bw / src.width, bh / src.height) * zoom;
  const vw = src.width * s, vh = src.height * s;
  const left = Math.min(0, Math.max(bw - vw, bw / 2 - spec.subject.fx * vw)) + dx;
  const top = Math.min(0, Math.max(bh - vh, bh / 2 - spec.subject.fy * vh));
  const card = box.r > 1;
  const g = style.grade;
  const filter = `contrast(${g.contrast}) saturate(${g.saturation}) brightness(${g.brightness})${blur ? ` blur(${blur}px)` : ''}${hue ? ` hue-rotate(${hue}deg)` : ''}`;

  return (
    <AbsoluteFill style={{opacity: box.o}}>
      <div style={{position: 'absolute', left: box.x, top: box.y, width: bw, height: bh, borderRadius: box.r, overflow: 'hidden', boxShadow: card ? '0 30px 90px -20px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,255,255,0.12)' : undefined}}>
        <div style={{position: 'absolute', left, top, width: src.width, height: src.height, scale: String(s), transformOrigin: '0 0', filter}}>
          {spec.clips.map((c, i) => (
            <Sequence key={i} from={c.from} durationInFrames={c.dur} premountFor={Math.round(spec.fps / 2)} name={`Clip ${i + 1}`}>
              <Video src={url(base, src.url)} trimBefore={c.trimBefore} style={{width: '100%', height: '100%'}} />
            </Sequence>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Grade: React.FC<{style: StyleProfile}> = ({style}) => {
  const f = useCurrentFrame();
  const {warmth, vignette, grain} = style.grade;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {warmth !== 0 && <AbsoluteFill style={{background: warmth > 0 ? '#ff9a3c' : '#3c8cff', opacity: Math.abs(warmth) * 0.22, mixBlendMode: 'soft-light'}} />}
      {vignette > 0 && <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${0.85 * vignette}) 100%)`}} />}
      {grain > 0 && (
        <AbsoluteFill style={{opacity: grain * 0.18, mixBlendMode: 'overlay'}}>
          <svg width="100%" height="100%">
            <filter id="lab-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 30} /></filter>
            <rect width="100%" height="100%" filter="url(#lab-grain)" />
          </svg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const Flash: React.FC<{spec: EditSpec}> = ({spec}) => {
  const f = useCurrentFrame();
  if (spec.style.transitions.type !== 'flash') return null;
  const near = spec.transitions.find((t) => f >= t.f - 1 && f <= t.f + 6);
  if (!near) return null;
  const o = interpolate(f, [near.f - 1, near.f, near.f + 6], [0, 0.85, 0], clamp);
  return <AbsoluteFill style={{background: 'white', opacity: o, pointerEvents: 'none'}} />;
};

const Captions: React.FC<{spec: EditSpec; hidden: (f: number) => boolean}> = ({spec, hidden}) => {
  const f = useCurrentFrame();
  const cs = spec.style.captions;
  if (!cs.enabled || hidden(f)) return null;
  const cap = spec.captions.find((c) => f >= c.a && f < c.b);
  if (!cap) return null;
  const unit = Math.min(spec.width, spec.height);
  const words = spec.words.slice(cap.w0, cap.w1 + 1);
  // Shrink when the longest word would not fit the safe width (≈0.62 em per char, wider in caps).
  const base = (cs.sizePct / 100) * unit;
  const longest = Math.max(1, ...words.map((w) => w.t.replace(/[,.;:!?]+$/, '').length));
  const safe = spec.width * 0.84 - (cs.box.enabled ? base * 0.8 : 0);
  const size = Math.min(base, safe / (longest * (cs.uppercase ? 0.7 : 0.6)));
  const family = fontFamily(cs.font, cs.weight);
  const local = f - cap.a;
  const inT = cs.animation === 'none' ? 1 : interpolate(local, [0, cs.animation === 'bounce' ? 9 : 6], [0, 1], {...clamp, easing: cs.animation === 'bounce' ? Easing.bezier(0.34, 1.8, 0.64, 1) : easeOut});
  const groupStyle: React.CSSProperties =
    cs.animation === 'pop' || cs.animation === 'bounce' ? {scale: String(0.75 + 0.25 * inT), opacity: Math.min(1, inT * 2)} :
    cs.animation === 'slide-up' ? {translate: `0 ${(1 - inT) * size * 0.6}px`, opacity: inT} :
    cs.animation === 'fade' ? {opacity: inT} : {};
  const strokePx = cs.strokeWidth * (size / 60);
  const boxRgba = hexToRgba(cs.box.color, cs.box.opacity);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: '6%', right: '6%', top: `${cs.yPct}%`, translate: '0 -50%', display: 'flex', justifyContent: 'center'}}>
        <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: size * 0.26, rowGap: size * 0.08, padding: cs.box.enabled ? `${size * 0.18}px ${size * 0.4}px` : 0, background: cs.box.enabled ? boxRgba : undefined, borderRadius: cs.box.radius, ...groupStyle}}>
          {words.map((w, i) => {
            const active = f >= w.f && f < (words[i + 1]?.f ?? cap.b);
            const spoken = f >= w.f;
            if (cs.mode === 'karaoke' && !spoken) return null;
            const isHl = cs.highlight === 'active-word' ? active : cs.highlight === 'keywords' ? Boolean(w.hl) : false;
            const wordIn = cs.mode === 'karaoke' ? interpolate(f, [w.f, w.f + 4], [0.6, 1], {...clamp, easing: easeOut}) : 1;
            const txt = (cs.uppercase ? w.t.toUpperCase() : w.t).replace(/[,.;:]+$/, '');
            return (
              <span key={cap.w0 + i} style={{
                position: 'relative', display: 'inline-block', fontFamily: family, fontWeight: cs.weight, fontSize: size, lineHeight: 1.1, letterSpacing: '-0.01em',
                color: isHl && !cs.activeWordBox ? cs.highlightColor : cs.color,
                WebkitTextStroke: strokePx > 0 ? `${strokePx}px ${cs.strokeColor}` : undefined, paintOrder: 'stroke fill',
                textShadow: cs.shadow ? `0 ${size * 0.08}px ${size * 0.3}px rgba(0,0,0,0.6)` : undefined,
                scale: String(wordIn),
                padding: cs.activeWordBox ? `0 ${size * 0.12}px` : undefined,
                borderRadius: size * 0.16,
                background: cs.activeWordBox && isHl ? cs.highlightColor : undefined,
              }}>
                {txt}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Callouts: React.FC<{spec: EditSpec; hidden: (f: number) => boolean}> = ({spec, hidden}) => {
  const f = useCurrentFrame();
  const cs = spec.style.callouts;
  if (!cs.enabled || hidden(f)) return null;
  const c = spec.callouts.find((x) => f >= x.f && f < x.f + x.dur);
  if (!c) return null;
  const local = f - c.f;
  const inT = interpolate(local, [0, 8], [0, 1], {...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1)});
  const outT = interpolate(local, [c.dur - 6, c.dur], [1, 0], clamp);
  const unit = Math.min(spec.width, spec.height);
  const family = fontFamily(cs.font, 800);
  if (cs.style === 'lower-third') {
    return (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: unit * 0.06, bottom: spec.height * 0.2, translate: `${(inT - 1) * 120}% 0`, opacity: outT, display: 'flex', alignItems: 'stretch'}}>
          <div style={{width: unit * 0.018, background: cs.accentColor}} />
          <div style={{background: 'rgba(10,10,14,0.82)', color: cs.color, fontFamily: family, fontWeight: 800, fontSize: unit * 0.05, padding: `${unit * 0.02}px ${unit * 0.035}px`, maxWidth: spec.width * 0.75}}>{c.text}</div>
        </div>
      </AbsoluteFill>
    );
  }
  if (cs.style === 'sticker') {
    return (
      <AbsoluteFill style={{pointerEvents: 'none', alignItems: 'center'}}>
        <div style={{marginTop: spec.height * 0.14, rotate: '-3deg', scale: String(inT), opacity: outT, background: cs.accentColor, color: cs.color, fontFamily: family, fontWeight: 800, fontSize: unit * 0.062, padding: `${unit * 0.018}px ${unit * 0.04}px`, borderRadius: unit * 0.02, boxShadow: '0 12px 40px rgba(0,0,0,0.45)', maxWidth: spec.width * 0.85, textAlign: 'center'}}>{c.text}</div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{pointerEvents: 'none', justifyContent: 'center', alignItems: 'center', background: `rgba(0,0,0,${0.45 * Math.min(inT, outT)})`}}>
      <div style={{scale: String(0.6 + 0.4 * inT), opacity: outT, color: cs.color, fontFamily: family, fontWeight: 800, fontSize: Math.min(unit * 0.11, (spec.width * 0.84) / (0.72 * Math.max(1, ...c.text.split(/\s+/).map((w) => w.length)))), lineHeight: 1, textAlign: 'center', textTransform: 'uppercase', maxWidth: spec.width * 0.86, textShadow: `0 0 ${unit * 0.05}px ${cs.accentColor}, 0 ${unit * 0.01}px ${unit * 0.04}px rgba(0,0,0,0.7)`}}>{c.text}</div>
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC<{spec: EditSpec}> = ({spec}) => {
  const f = useCurrentFrame();
  const p = spec.style.progressBar;
  if (!p.enabled) return null;
  const h = Math.max(6, Math.min(spec.width, spec.height) * 0.009);
  return <div style={{position: 'absolute', left: 0, [p.position]: 0, height: h, width: `${(f / Math.max(1, spec.durationInFrames - 1)) * 100}%`, background: p.color}} />;
};

const Sound: React.FC<{spec: EditSpec; base?: string}> = ({spec, base}) => {
  const {music} = spec;
  const duck = spec.style.audio.music.duckUnderVoice;
  const speaking = (f: number) => {
    let lo = 0, hi = spec.words.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const w = spec.words[mid];
      if (f < w.f - 6) hi = mid - 1; else if (f > w.e + 10) lo = mid + 1; else return true;
    }
    return false;
  };
  return (
    <>
      {spec.sfx.map((s, i) => (
        <Sequence key={i} from={Math.max(0, s.f)} durationInFrames={spec.fps * 3} layout="none" name={`sfx:${s.name}`}>
          <Audio src={url(base, `/static/sfx/${s.name}.wav`)} volume={() => s.volume} />
        </Sequence>
      ))}
      {music && (
        <Audio name="Trilha" src={url(base, music.url)} loop volume={(f) => {
          const fade = interpolate(f, [0, 15, spec.durationInFrames - 20, spec.durationInFrames], [0, 1, 1, 0], clamp);
          return music.volume * fade * (duck && speaking(f) ? 0.45 : 1);
        }} />
      )}
    </>
  );
};

const hexToRgba = (hex: string, a: number) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const Empty: React.FC = () => (
  <AbsoluteFill style={{background: '#0b0b10', color: '#9a9aae', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', fontSize: 40, textAlign: 'center', padding: 80}}>
    Nenhuma edição carregada. Gere uma no Lab (npm run lab).
  </AbsoluteFill>
);

const SceneLayer: React.FC<{spec: EditSpec; placed: Placed[]; layer: 'full' | 'over'}> = ({spec, placed, layer}) => (
  <>
    {placed.filter((p) => p.scene.layer === layer).map(({scene, from, dur}) => {
      const words = spec.words.filter((w) => w.f >= from && w.f < from + dur).map((w) => ({t: w.t, f: w.f - from, e: w.e - from}));
      const C = scene.Component;
      return (
        <Sequence key={scene.id} from={from} durationInFrames={dur} name={`motion:${scene.id}`} premountFor={10}>
          <C durationInFrames={dur} width={spec.width} height={spec.height} fps={spec.fps} words={words} style={spec.style} />
        </Sequence>
      );
    })}
  </>
);

/** Data-driven edit: everything comes from an EditSpec produced by the Lab, plus AI-written motion scenes. */
export const LabEdit: React.FC<LabProps> = ({spec, base}) => {
  const placed = useMemo(() => (spec ? placeScenes(spec) : []), [spec]);
  if (!spec) return <Empty />;
  const bold = spec.style.callouts.enabled && spec.style.callouts.style === 'bold-center';
  const inScene = (f: number) => placed.some((p) => f >= p.from && f < p.from + p.dur);
  const hideCaptions = (f: number) =>
    (bold && !inScene(f) && spec.callouts.some((c) => f >= c.f && f < c.f + c.dur)) ||
    placed.some((p) => p.scene.hideCaptions && f >= p.from && f < p.from + p.dur);
  return (
    <LabBase.Provider value={base ?? ''}>
      <AbsoluteFill style={{background: '#000'}}>
        <SceneLayer spec={spec} placed={placed} layer="full" />
        <Frame spec={spec} base={base} placed={placed} />
        <Grade style={spec.style} />
        <Flash spec={spec} />
        <SceneLayer spec={spec} placed={placed} layer="over" />
        <Callouts spec={spec} hidden={inScene} />
        <Captions spec={spec} hidden={hideCaptions} />
        <ProgressBar spec={spec} />
        <Sound spec={spec} base={base} />
      </AbsoluteFill>
    </LabBase.Provider>
  );
};

export const LAB_DEFAULT_PORT = 4747;
