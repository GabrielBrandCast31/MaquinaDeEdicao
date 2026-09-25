import path from "path"; import {execSync} from "child_process";
import {transcribe, toCaptions} from "@remotion/install-whisper-cpp";
const w = path.join(process.cwd(), "whisper.cpp");
for (const [a, b] of [[0, 6], [19, 27], [201, 210.7]]) {
  const file = path.resolve(`scripts/qa_${a}.wav`);
  execSync(`ffmpeg -loglevel error -y -ss ${a} -to ${b} -i scripts/final16k.wav ${file}`);
  const out = await transcribe({model: "large-v3-turbo", whisperPath: w, whisperCppVersion: "1.7.4", inputPath: file, language: "pt", tokenLevelTimestamps: true, printOutput: false});
  console.log(`[${a}-${b}]`, toCaptions({whisperCppOutput: out}).captions.map((c) => c.text).join(""));
}
