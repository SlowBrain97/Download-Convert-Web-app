import Ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';

const isProd = process.env.NODE_ENV === "production";
export let ffmpegPath: any;

if (isProd) {
  ffmpegPath = fs.existsSync("/usr/bin/ffmpeg")
    ? "/usr/bin/ffmpeg"
    : "/usr/local/bin/ffmpeg";
} else {
  try {
    const ffmpegStatic = await import("ffmpeg-static");
    ffmpegPath = ffmpegStatic.default;
  } catch {
    console.warn("⚠️ ffmpeg-static not found — ensure it's installed in dev env");
  }
}

if (ffmpegPath) {
  Ffmpeg.setFfmpegPath(ffmpegPath);
  console.log("🎬 Using ffmpeg at:", ffmpegPath);
} else {
  console.error("❌ No ffmpeg found! Install ffmpeg or ffmpeg-static.");
}