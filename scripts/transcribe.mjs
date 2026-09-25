import path from "path";
import fs from "fs";
import {downloadWhisperModel, installWhisperCpp, transcribe, toCaptions} from "@remotion/install-whisper-cpp";
const to = path.join(process.cwd(), "whisper.cpp");
const version = "1.7.4";
await installWhisperCpp({to, version});
await downloadWhisperModel({model: "large-v3-turbo", folder: to});
const out = await transcribe({
  model: "large-v3-turbo", whisperPath: to, whisperCppVersion: version,
  inputPath: path.join(process.cwd(), "scripts/audio16k.wav"),
  tokenLevelTimestamps: true, language: "pt",
});
const {captions} = toCaptions({whisperCppOutput: out});
fs.writeFileSync("scripts/captions-raw.json", JSON.stringify(captions, null, 2));
console.log("done", captions.length);
