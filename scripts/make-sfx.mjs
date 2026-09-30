// Builds the extra sound effects in public/sfx:
//  - synthesizes the Lab's own SFX (deterministic, no samples needed)
//  - downloads the rest of the @remotion/sfx library (remotion.media) as 48 kHz stereo WAV
// Run: node scripts/make-sfx.mjs [--force]   (existing files are kept unless --force)
// The catalog shown in the Lab and handed to the AI lives in src/lab/sfx.ts — add new names there too.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'sfx');
const FORCE = process.argv.includes('--force');
const SR = 48000;
fs.mkdirSync(OUT, {recursive: true});

// ---------- DSP ----------
const TAU = Math.PI * 2;
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const len = (sec) => Math.round(sec * SR);
const buf = (sec) => new Float32Array(len(sec));
const lerp = (a, b, t) => a + (b - a) * t;
const expLerp = (a, b, t) => a * Math.pow(b / a, Math.min(1, Math.max(0, t)));

/** Zero-delay-feedback state-variable filter with a per-sample cutoff (fc may be a function of t). */
const svf = (x, mode, fc, q = 0.707) => {
  const y = new Float32Array(x.length);
  const k = 1 / q;
  let ic1 = 0, ic2 = 0;
  for (let i = 0; i < x.length; i++) {
    const f = Math.min(SR * 0.45, Math.max(20, typeof fc === 'function' ? fc(i / SR) : fc));
    const g = Math.tan((Math.PI * f) / SR);
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x[i] - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    y[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 : x[i] - k * v1 - v2;
  }
  return y;
};

const noise = (sec, seed = 1) => { const r = rng(seed); return buf(sec).map(() => r() * 2 - 1); };

/** Oscillator with a per-sample frequency (Hz or function of t). */
const osc = (sec, freq, shape = 'sine', phase0 = 0) => {
  const y = buf(sec);
  let ph = phase0;
  for (let i = 0; i < y.length; i++) {
    const f = typeof freq === 'function' ? freq(i / SR) : freq;
    ph = (ph + f / SR) % 1;
    y[i] = shape === 'sine' ? Math.sin(TAU * ph)
      : shape === 'saw' ? 2 * ph - 1
      : shape === 'square' ? (ph < 0.5 ? 1 : -1)
      : 1 - 4 * Math.abs(ph - 0.5); // tri
  }
  return y;
};

/** Multiplies by an envelope function of t (seconds). */
const env = (x, fn) => x.map((v, i) => v * fn(i / SR));
const decay = (tau, attack = 0.002) => (t) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));
const gain = (x, g) => x.map((v) => v * g);
const drive = (x, k) => x.map((v) => Math.tanh(v * k) / Math.tanh(k));
const mix = (sec, ...parts) => {
  const y = buf(sec);
  for (const [x, at = 0, g = 1] of parts) {
    const o = len(at);
    for (let i = 0; i < x.length && i + o < y.length; i++) y[i + o] += x[i] * g;
  }
  return y;
};

/** Small Schroeder reverb, returns {L, R} with the dry signal mixed in. */
const reverb = (x, {wet = 0.3, size = 1, tail = 1.2} = {}) => {
  const outLen = x.length + len(tail);
  const run = (delaysMs) => {
    const y = new Float32Array(outLen);
    for (const ms of delaysMs) {
      const d = Math.round((ms * size * SR) / 1000);
      const fb = Math.pow(0.001, (ms * size) / 1000 / tail);
      const line = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const inp = i < x.length ? x[i] : 0;
        line[i] = inp + (i >= d ? line[i - d] * fb : 0);
        y[i] += line[i] * 0.25;
      }
    }
    for (const ms of [5, 1.7]) {
      const d = Math.round((ms * SR) / 1000), g = 0.7;
      const z = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const xd = i >= d ? y[i - d] : 0, zd = i >= d ? z[i - d] : 0;
        z[i] = -g * y[i] + xd + g * zd;
      }
      y.set(z);
    }
    return y.map((v, i) => (i < x.length ? x[i] : 0) * (1 - wet) + v * wet);
  };
  return {L: run([29.7, 37.1, 41.1, 43.7]), R: run([31.3, 35.9, 42.7, 45.1])};
};

/** Equal-power pan over time: pan(t) in [-1, 1]. */
const pan = (x, fn) => {
  const L = new Float32Array(x.length), R = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const p = (Math.max(-1, Math.min(1, fn(i / SR))) + 1) * (Math.PI / 4);
    L[i] = x[i] * Math.cos(p); R[i] = x[i] * Math.sin(p);
  }
  return {L, R};
};

/** Peak-normalizes, but caps the RMS so steady tones (beeps, buzzers) are not louder than the rest of the library. */
const writeWav = (file, sig, peak = 0.89, maxRms = 0.17) => {
  const L = sig.L ?? sig, R = sig.R ?? sig;
  const n = Math.max(L.length, R.length);
  let max = 1e-9, sq = 0;
  for (let i = 0; i < n; i++) {
    const l = L[i] ?? 0, r = R[i] ?? 0;
    max = Math.max(max, Math.abs(l), Math.abs(r));
    sq += (l * l + r * r) / 2;
  }
  const rms = Math.sqrt(sq / n) || 1e-9;
  const g = Math.min(peak / max, maxRms / rms);
  const fade = Math.min(len(0.006), n);
  const data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const f = i >= n - fade ? (n - i) / fade : i < 48 ? i / 48 : 1;
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, (L[i] ?? 0) * g * f)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, (R[i] ?? 0) * g * f)) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
};

// ---------- building blocks ----------
const keyClick = (seed, bright = 3200) => {
  const r = rng(seed);
  const f = bright * (0.8 + r() * 0.5);
  return mix(0.06,
    [env(svf(noise(0.06, seed), 'bp', f, 2.2), decay(0.007, 0.0005)), 0, 1],
    [env(osc(0.06, 170 + r() * 40), decay(0.012, 0.0005)), 0, 0.5],
  );
};
const thump = (sec, f0, f1, tau, speed = 30) => env(osc(sec, (t) => f1 + (f0 - f1) * Math.exp(-t * speed)), decay(tau, 0.001));
const tone = (sec, f, tau, shape = 'sine', attack = 0.004) => env(osc(sec, f, shape), decay(tau, attack));
const bell = (sec, f, tau, ratio = 3.5, index = 3) => {
  const y = buf(sec);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const idx = index * Math.exp(-t / (tau * 0.5));
    y[i] = Math.sin(TAU * f * t + idx * Math.sin(TAU * f * ratio * t)) * decay(tau, 0.001)(t);
  }
  return y;
};

// ---------- the Lab's own SFX ----------
const SYNTH = {
  // transições
  'swoosh-long': () => {
    const d = 0.95;
    const x = env(svf(noise(d, 11), 'bp', (t) => 300 + 3600 * Math.sin(Math.PI * Math.min(1, t / d)) ** 2, 1.1), (t) => Math.sin(Math.PI * Math.min(1, t / d)) ** 2);
    return pan(x, (t) => lerp(-0.8, 0.8, t / d));
  },
  'swoosh-reverse': () => {
    const d = 0.75;
    return pan(env(svf(noise(d, 12), 'bp', (t) => expLerp(350, 5000, t / d), 1.3), (t) => (t / d) ** 3), (t) => lerp(0.6, -0.2, t / d));
  },
  'whoosh-hit': () => {
    const d = 0.55;
    const rise = env(svf(noise(d, 13), 'bp', (t) => expLerp(400, 4500, t / d), 1.2), (t) => (t / d) ** 3);
    const hit = mix(0.8, [thump(0.8, 160, 45, 0.16), 0, 1], [env(svf(noise(0.8, 14), 'lp', 2200), decay(0.04)), 0, 0.7]);
    return reverb(drive(mix(1.35, [rise, 0, 0.8], [hit, d, 1]), 1.8), {wet: 0.22, tail: 0.8});
  },
  swipe: () => {
    const d = 0.24;
    return pan(env(svf(noise(d, 15), 'bp', (t) => expLerp(1800, 7500, t / d), 1.6), decay(0.06, 0.02)), (t) => lerp(-0.7, 0.7, t / d));
  },
  zip: () => {
    const d = 0.32;
    const n = svf(noise(d, 16), 'bp', (t) => expLerp(1500, 5200, t / d), 2);
    const am = osc(d, (t) => lerp(55, 150, t / d), 'square').map((v) => (v + 1) / 2);
    return env(n.map((v, i) => v * am[i]), (t) => Math.sin(Math.PI * Math.min(1, t / d)));
  },
  'tape-stop': () => {
    const d = 0.75;
    const k = (t) => Math.max(0.02, (1 - t / d) ** 1.6);
    const x = mix(d, [osc(d, (t) => 110 * k(t), 'saw'), 0, 0.5], [osc(d, (t) => 164.8 * k(t), 'saw'), 0, 0.4], [osc(d, (t) => 220 * k(t)), 0, 0.5]);
    return env(svf(x, 'lp', (t) => 150 + 2600 * k(t)), (t) => Math.min(1, t / 0.01) * (1 - t / d) ** 0.6);
  },
  rewind: () => {
    const d = 0.85;
    const n = svf(noise(d, 17), 'bp', (t) => expLerp(900, 3800, t / d), 3);
    const am = osc(d, (t) => lerp(7, 34, t / d)).map((v) => 0.25 + 0.75 * (v + 1) / 2);
    const chirp = osc(d, (t) => expLerp(300, 1800, ((t * 12) % 1)), 'tri');
    return env(mix(d, [n.map((v, i) => v * am[i]), 0, 1], [chirp, 0, 0.12]), (t) => Math.min(1, t / 0.05) * (t > d - 0.08 ? (d - t) / 0.08 : 1));
  },
  // impactos
  boom: () => {
    const x = mix(2, [thump(2, 90, 34, 0.7, 8), 0, 1], [env(svf(noise(2, 21), 'lp', 900), decay(0.12)), 0, 0.6]);
    return reverb(drive(x, 2.2), {wet: 0.28, size: 1.6, tail: 1.8});
  },
  braam: () => {
    const d = 2.4;
    const saws = mix(d,
      ...[55, 55.4, 82.4, 110.3].map((f, i) => [osc(d, f, 'saw', i * 0.13), 0, 0.4]),
      [osc(d, 27.5), 0, 0.6],
    );
    const x = svf(saws, 'lp', (t) => 180 + 1300 * Math.exp(-t * 1.4) * Math.min(1, t / 0.08), 1.4);
    return reverb(env(drive(x, 3), (t) => Math.min(1, t / 0.03) * Math.exp(-t / 1.1)), {wet: 0.3, size: 1.8, tail: 1.6});
  },
  thud: () => mix(0.4, [thump(0.4, 95, 42, 0.09, 25), 0, 1], [env(svf(noise(0.4, 22), 'lp', 600), decay(0.015)), 0, 0.5]),
  punch: () => drive(mix(0.45,
    [thump(0.45, 170, 52, 0.12, 28), 0, 1],
    [env(svf(noise(0.45, 23), 'bp', 1600, 0.9), decay(0.025)), 0, 0.8],
    [env(svf(noise(0.45, 24), 'hp', 4500), decay(0.008)), 0, 0.4],
  ), 2.5),
  slam: () => reverb(drive(mix(0.6,
    [env(svf(noise(0.6, 25), 'lp', 1400), decay(0.07)), 0, 1],
    [thump(0.6, 110, 60, 0.2, 18), 0, 1],
  ), 2), {wet: 0.45, size: 2, tail: 1.3}),
  kick: () => drive(env(osc(0.7, (t) => 48 + 130 * Math.exp(-t * 32)), decay(0.22, 0.001)), 1.6),
  clap: () => {
    const burst = (s) => env(svf(noise(0.3, s), 'bp', 1300, 1.1), decay(0.009, 0.0008));
    const tail = env(svf(noise(0.35, 26), 'bp', 1100, 0.8), decay(0.07, 0.001));
    return reverb(mix(0.4, [burst(27), 0, 1], [burst(28), 0.011, 0.9], [burst(29), 0.022, 0.85], [tail, 0.03, 0.8]), {wet: 0.25, tail: 0.6});
  },
  // tensão
  heartbeat: () => {
    const beat = (g) => gain(svf(mix(0.3, [thump(0.3, 70, 38, 0.08, 20), 0, 1]), 'lp', 300), g);
    return mix(1.7, [beat(1), 0, 1], [beat(0.75), 0.26, 1], [beat(0.9), 0.85, 1], [beat(0.65), 1.11, 1]);
  },
  'riser-long': () => {
    const d = 4;
    const n = svf(noise(d, 31), 'bp', (t) => expLerp(250, 7000, t / d), 1.8);
    const s = svf(osc(d, (t) => expLerp(110, 880, t / d), 'saw'), 'lp', (t) => expLerp(400, 5000, t / d));
    const x = env(mix(d, [n, 0, 1], [s, 0, 0.25]), (t) => (t / d) ** 2.2);
    return pan(x, (t) => 0.35 * Math.sin(t * 5));
  },
  drone: () => {
    const d = 3.6;
    const x = mix(d, [osc(d, 55), 0, 0.7], [osc(d, 55.3, 'saw'), 0, 0.35], [osc(d, 82.6), 0, 0.35], [osc(d, 110.2, 'tri'), 0, 0.15]);
    return reverb(env(svf(x, 'lp', (t) => 260 + 180 * Math.sin(t * 2.1), 2), (t) => Math.min(1, t / 0.6) * Math.min(1, (d - t) / 1.2)), {wet: 0.35, size: 1.5, tail: 1.5});
  },
  'reverse-cymbal': () => {
    const d = 2;
    const x = mix(d, [svf(noise(d, 32), 'hp', 5200), 0, 0.8], [svf(noise(d, 33), 'bp', 8500, 1.5), 0, 0.6]);
    return pan(env(x, (t) => (t / d) ** 2.6), (t) => 0.3 * Math.sin(t * 3));
  },
  'clock-tick': () => mix(2.1, ...[0, 0.5, 1, 1.5].map((at, i) => [env(svf(noise(0.05, 34 + i), 'bp', i % 2 ? 2300 : 3100, 9), decay(0.006, 0.0004)), at, 1])),
  drumroll: () => {
    const d = 2.3;
    const parts = [];
    let t = 0, i = 0;
    while (t < 1.75) {
      const rate = lerp(11, 30, t / 1.75);
      parts.push([env(svf(noise(0.08, 40 + i), 'bp', 1900, 0.9), decay(0.018, 0.001)), t, 0.35 + 0.65 * (t / 1.75)]);
      t += 1 / rate; i++;
    }
    parts.push([drive(mix(0.6, [thump(0.6, 140, 55, 0.12), 0, 1], [env(svf(noise(0.6, 39), 'bp', 1800, 0.8), decay(0.08)), 0, 0.9]), 1.5), 1.78, 1.3]);
    parts.push([env(svf(noise(0.55, 38), 'hp', 6000), decay(0.25)), 1.78, 0.5]);
    return reverb(mix(d, ...parts), {wet: 0.2, tail: 0.8});
  },
  // brilho e sucesso
  sparkle: () => {
    const r = rng(51);
    const L = buf(1.3), R = buf(1.3);
    for (let i = 0; i < 16; i++) {
      const at = r() * 0.9, f = 2600 + r() * 3800, p = r() * 2 - 1;
      const b = gain(tone(0.12, f, 0.05), 1 - at * 0.6);
      const o = len(at);
      for (let j = 0; j < b.length && o + j < L.length; j++) { L[o + j] += b[j] * (1 - p) / 2; R[o + j] += b[j] * (1 + p) / 2; }
    }
    const rl = reverb(L, {wet: 0.35, tail: 0.6}).L, rr = reverb(R, {wet: 0.35, tail: 0.6}).R;
    return {L: rl, R: rr};
  },
  chime: () => reverb(mix(2.2, [bell(2.2, 880, 0.9), 0, 1], [bell(2.2, 1318.5, 0.7, 2.4, 1.5), 0.005, 0.4]), {wet: 0.3, tail: 1.2}),
  magic: () => {
    const notes = [1046.5, 1318.5, 1568, 2093, 2637, 3136];
    const x = mix(1.4, ...notes.map((f, i) => [mix(0.6, [tone(0.6, f, 0.28), 0, 1], [tone(0.6, f * 2, 0.1, 'tri'), 0, 0.15]), i * 0.055, 1 - i * 0.08]),
      [env(svf(noise(1, 52), 'hp', 7000), (t) => Math.exp(-t / 0.3) * Math.min(1, t / 0.1)), 0.05, 0.25]);
    return reverb(x, {wet: 0.35, tail: 1});
  },
  success: () => reverb(mix(0.8,
    [mix(0.5, [tone(0.5, 880, 0.16), 0, 1], [tone(0.5, 1760, 0.06, 'tri'), 0, 0.15]), 0, 0.9],
    [mix(0.7, [tone(0.7, 1318.5, 0.28), 0, 1], [tone(0.7, 2637, 0.08, 'tri'), 0, 0.15]), 0.11, 1],
  ), {wet: 0.22, tail: 0.6}),
  'level-up': () => {
    const notes = [523.3, 659.3, 784, 1046.5, 1318.5, 1568, 2093];
    return mix(0.85, ...notes.map((f, i) => [svf(tone(i === notes.length - 1 ? 0.4 : 0.08, f, i === notes.length - 1 ? 0.18 : 0.05, 'square', 0.001), 'lp', 6000), i * 0.05, 0.6]));
  },
  coin: () => {
    const a = svf(osc(0.07, 987.8, 'square'), 'lp', 7000);
    const b = svf(tone(0.45, 1318.5, 0.16, 'square', 0.001), 'lp', 7000);
    return mix(0.52, [a, 0, 0.6], [b, 0.07, 0.6]);
  },
  cash: () => {
    const click = (s) => env(svf(noise(0.05, s), 'bp', 3000, 3), decay(0.006, 0.0005));
    return reverb(mix(1.2,
      [click(61), 0, 1], [click(62), 0.045, 0.8], [click(63), 0.09, 0.9],
      [bell(1, 2093, 0.45, 2.76, 1.2), 0.12, 0.7], [bell(1, 2637, 0.4, 2.76, 1), 0.125, 0.5],
    ), {wet: 0.2, tail: 0.6});
  },
  // interface
  typing: () => {
    const r = rng(71);
    const parts = [];
    let t = 0.02, i = 0;
    while (t < 1.55) { parts.push([keyClick(72 + i), t, 0.7 + r() * 0.3]); t += 0.07 + r() * 0.1 + (r() < 0.12 ? 0.15 : 0); i++; }
    return mix(1.65, ...parts);
  },
  'type-key': () => keyClick(80),
  bubble: () => env(osc(0.16, (t) => expLerp(280, 1500, t / 0.07)), (t) => Math.min(1, t / 0.004) * Math.exp(-t / 0.035)),
  blip: () => mix(0.1, [tone(0.1, 1250, 0.035), 0, 1], [tone(0.1, 2500, 0.015), 0, 0.25]),
  'toggle-on': () => mix(0.16, [keyClick(81, 1900), 0, 1], [keyClick(82, 2800), 0.055, 0.9]),
  'toggle-off': () => mix(0.16, [keyClick(83, 2800), 0, 0.9], [keyClick(84, 1900), 0.055, 1]),
  message: () => mix(0.5, [mix(0.3, [tone(0.3, 1174.7, 0.07), 0, 1], [tone(0.3, 2349, 0.03, 'tri'), 0, 0.1]), 0, 0.9], [mix(0.4, [tone(0.4, 1568, 0.1), 0, 1], [tone(0.4, 3136, 0.03, 'tri'), 0, 0.1]), 0.1, 1]),
  'camera-flash': () => mix(1,
    [env(svf(noise(0.08, 91), 'bp', 2500, 1.5), decay(0.012, 0.0005)), 0, 1],
    [env(svf(noise(0.1, 92), 'bp', 1400, 1.2), decay(0.02, 0.0005)), 0.06, 0.7],
    [env(osc(0.9, (t) => expLerp(2500, 9000, t / 0.9)), (t) => 0.12 * Math.min(1, t / 0.2) * (1 - t / 0.9)), 0.1, 1],
  ),
  scan: () => {
    const d = 0.9;
    const s = svf(osc(d, (t) => expLerp(500, 1500, t / d), 'square'), 'bp', (t) => expLerp(700, 2200, t / d), 2);
    const am = osc(d, 26).map((v) => 0.35 + 0.65 * (v + 1) / 2);
    return env(s.map((v, i) => v * am[i]), (t) => Math.min(1, t / 0.02) * Math.min(1, (d - t) / 0.08));
  },
  beep: () => env(osc(0.25, 1000), (t) => Math.min(1, t / 0.005) * Math.min(1, (0.2 - t) / 0.01) * (t < 0.2 ? 1 : 0)),
  countdown: () => {
    const b = (f, d) => env(osc(d + 0.02, f), (t) => Math.min(1, t / 0.005) * Math.max(0, Math.min(1, (d - t) / 0.01)));
    return mix(3.5, [b(880, 0.15), 0, 1], [b(880, 0.15), 1, 1], [b(880, 0.15), 2, 1], [b(1760, 0.45), 3, 1]);
  },
  laser: () => drive(svf(env(osc(0.35, (t) => 200 + 1800 * Math.exp(-t * 11), 'square'), decay(0.1, 0.001)), 'lp', 5000), 1.3),
  'glitch-long': () => {
    const r = rng(101);
    const parts = [];
    let t = 0;
    while (t < 0.65) {
      const d = 0.015 + r() * 0.035;
      const kind = r();
      const seg = kind < 0.4 ? svf(noise(d, 102 + parts.length), 'bp', 800 + r() * 5000, 2)
        : kind < 0.75 ? osc(d, 80 + r() * 1800, 'square')
        : buf(d);
      parts.push([seg, t, 0.5 + r() * 0.5]);
      t += d + (r() < 0.25 ? r() * 0.03 : 0);
    }
    return pan(mix(0.7, ...parts), (tt) => Math.sin(tt * 60) * 0.5);
  },
  'buzz-wrong': () => {
    const pulse = () => svf(mix(0.2, [osc(0.2, 150, 'square'), 0, 0.5], [osc(0.2, 155, 'square'), 0, 0.5]), 'lp', 1600);
    return mix(0.5, [env(pulse(), (t) => (t < 0.17 ? Math.min(1, t / 0.005) : 0)), 0, 1], [env(pulse(), (t) => (t < 0.2 ? Math.min(1, t / 0.005) * Math.min(1, (0.2 - t) / 0.02) : 0)), 0.23, 1]);
  },
};

// ---------- @remotion/sfx sounds not bundled yet ----------
const REMOTE = [
  'shutter-old', 'bruh', 'vine-boom', 'windows-xp-error', 'fah', 'spongebob-fail', 'omg-hell-nah', 'price-is-right-fail',
  'romance-meme', 'bone-crack', 'anime-wow', 'yippee', 'loading-lag', 'wilhelm-scream', 'mac-quack', 'skedaddle',
  'snapchat-notification', 'nelly-ahh', 'sanctuary-guardian-what', 'minecraft-hurt', 'oh-my-god-vine',
  'illuminati-confirmed', 'dramatic-boomer', 'triggered', 'record-scratch',
];

let made = 0, skipped = 0;
for (const [name, fn] of Object.entries(SYNTH)) {
  const file = path.join(OUT, `${name}.wav`);
  if (!FORCE && fs.existsSync(file)) { skipped++; continue; }
  writeWav(file, fn());
  made++;
  console.log(`♪ ${name}`);
}
for (const name of REMOTE) {
  const file = path.join(OUT, `${name}.wav`);
  if (!FORCE && fs.existsSync(file)) { skipped++; continue; }
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', `https://remotion.media/${name}.wav`, '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s16le', file]);
  if (r.status !== 0) { console.error(`✗ ${name}: ${String(r.stderr).slice(-200)}`); continue; }
  made++;
  console.log(`↓ ${name}`);
}
console.log(`\n${made} efeitos criados, ${skipped} já existiam em public/sfx`);
