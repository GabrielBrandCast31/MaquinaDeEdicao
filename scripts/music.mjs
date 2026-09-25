// Synthesizes 3 loopable stems (pad / pulse / drive) at 100 BPM, 8 bars each.
import fs from "fs";
const SR = 48000, BPM = 100, BEAT = 60 / BPM, BARS = 8, LEN = Math.round(BARS * 4 * BEAT * SR);
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Am - F - C - G (2 bars each)
const chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]];
const bass = [45, 41, 48, 43];
const chordAt = (t) => Math.floor(t / (8 * BEAT)) % 4;
function writeWav(name, L, R) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.85 / (peak || 1);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32767), 46 + i * 4); }
  fs.writeFileSync(`public/music/${name}.wav`, buf);
}
const saw = (p) => 2 * (p - Math.floor(p + 0.5));
// PAD: detuned saws, lowpass, crossfaded chords
{
  const L = new Float32Array(LEN), R = new Float32Array(LEN); let lpL = 0, lpR = 0;
  for (let i = 0; i < LEN; i++) {
    const t = i / SR, c = chordAt(t), local = (t % (8 * BEAT)) / (8 * BEAT);
    const env = Math.min(1, local * 6) * Math.min(1, (1 - local) * 8 + 0.3);
    let l = 0, r = 0;
    for (const n of chords[c]) { const f = midi(n); l += saw(f * t * 0.997) + saw(f * t * 1.004) * 0.6; r += saw(f * t * 1.003) + saw(f * t * 0.995) * 0.6; }
    const cut = 0.035 + 0.02 * Math.sin(2 * Math.PI * t / (16 * BEAT));
    lpL += cut * (l * env - lpL); lpR += cut * (r * env - lpR);
    L[i] = lpL + 0.25 * Math.sin(2 * Math.PI * midi(bass[c] - 12) * t) * env; R[i] = lpR + 0.25 * Math.sin(2 * Math.PI * midi(bass[c] - 12) * t) * env;
  }
  writeWav("pad", L, R);
}
// PULSE: 8th-note arpeggio pluck with ping-pong delay
{
  const L = new Float32Array(LEN), R = new Float32Array(LEN), step = BEAT / 2;
  for (let s = 0; s < BARS * 8; s++) {
    const t0 = s * step, c = chordAt(t0 + 0.001), notes = chords[c], n = notes[[0, 2, 1, 3, 2, 1, 3, 2][s % 8]] + 12, f = midi(n);
    const st = Math.round(t0 * SR);
    for (let k = 0; k < SR * 0.5 && st + k < LEN; k++) {
      const t = k / SR, env = Math.exp(-t * 9), v = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * env * 0.5;
      L[st + k] += v; R[st + k] += v;
    }
  }
  const d = Math.round(step * 0.75 * SR);
  for (let i = d; i < LEN; i++) { L[i] += R[i - d] * 0.35; R[i] += L[i - d] * 0.3; }
  writeWav("pulse", L, R);
}
// DRIVE: kick, hats, sub bass (for offer / CTA)
{
  const L = new Float32Array(LEN), R = new Float32Array(LEN);
  let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let b = 0; b < BARS * 4; b++) {
    const st = Math.round(b * BEAT * SR);
    for (let k = 0; k < SR * 0.4 && st + k < LEN; k++) { const t = k / SR; const v = Math.sin(2 * Math.PI * (45 * t + 60 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 7) * 1.1; L[st + k] += v; R[st + k] += v; }
  }
  for (let h = 0; h < BARS * 16; h++) {
    const st = Math.round(h * BEAT / 4 * SR), acc = h % 4 === 2 ? 0.35 : 0.12; let hp = 0, prev = 0;
    for (let k = 0; k < SR * 0.05 && st + k < LEN; k++) { const x = rnd(); hp = 0.9 * (hp + x - prev); prev = x; const v = hp * Math.exp(-k / SR * 80) * acc; L[st + k] += v * 0.8; R[st + k] += v; }
  }
  for (let i = 0; i < LEN; i++) { const t = i / SR, c = chordAt(t), ph = (t % (BEAT / 2)) / (BEAT / 2), env = Math.min(1, ph * 20) * Math.exp(-ph * 2.5); const v = Math.sin(2 * Math.PI * midi(bass[c] - 12) * t) * env * 0.45; L[i] += v; R[i] += v; }
  writeWav("drive", L, R);
}
console.log("ok", LEN / SR, "s");
