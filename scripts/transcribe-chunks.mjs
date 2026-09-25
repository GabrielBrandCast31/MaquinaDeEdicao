import path from "path";
import fs from "fs";
import {execSync} from "child_process";
import {transcribe, toCaptions} from "@remotion/install-whisper-cpp";
const whisperPath = path.join(process.cwd(), "whisper.cpp");
const log = execSync(`ffmpeg -hide_banner -i scripts/audio16k.wav -af silencedetect=noise=-38dB:d=0.3 -f null - 2>&1`).toString();
const sil = []; let s = null;
for (const m of log.matchAll(/silence_(start|end): ([0-9.]+)/g)) { if (m[1] === "start") s = +m[2]; else { sil.push([s, +m[2]]); } }
const START = 24.0, END = 268.3;
const chunks = []; let cur = START;
for (const [a, b] of sil) { if (b < START || a > END) continue; if (a > cur + 0.05) chunks.push([cur, Math.min(a, END)]); cur = Math.max(cur, b); }
if (cur < END) chunks.push([cur, END]);
fs.mkdirSync("scripts/chunks", {recursive: true});
const words = [];
for (let i = 0; i < chunks.length; i++) {
  const [a, b] = chunks[i]; const pa = Math.max(0, a - 0.1), pb = b + 0.1;
  const file = path.resolve(`scripts/chunks/c${i}.wav`);
  execSync(`ffmpeg -loglevel error -y -ss ${pa} -to ${pb} -i scripts/audio16k.wav -ar 16000 -ac 1 -c:a pcm_s16le ${file}`);
  const out = await transcribe({model: "large-v3-turbo", whisperPath, whisperCppVersion: "1.7.4", inputPath: file, tokenLevelTimestamps: true, language: "pt", splitOnWord: true, printOutput: false});
  const {captions} = toCaptions({whisperCppOutput: out});
  const txt = captions.map((c) => c.text).join("");
  console.log(i, a.toFixed(2), b.toFixed(2), txt);
  for (const c of captions) words.push({text: c.text, start: Math.min(b, Math.max(a, pa + c.startMs / 1000)), end: Math.min(b, Math.max(a, pa + c.endMs / 1000)), chunk: i});
}
fs.writeFileSync("scripts/chunks.json", JSON.stringify({chunks, words}, null, 1));
