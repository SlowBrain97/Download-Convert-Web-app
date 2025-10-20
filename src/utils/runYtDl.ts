import { spawn } from "child_process";
import { tasks } from "./taskManager.js";
import { logger } from "./logger.js";



export default function runYtDlp(
  url: string,
  fileType: "audio" | "video",
  outPath: string,
  ffmpegPath: string,
  cookiesPath: string,
  taskId: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const baseArgs = [
      url,
      "--no-warnings",
      "--cookies", cookiesPath,
      "--extractor-args", "youtube:player_client=android,ios",
      "--user-agent", "com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip",
      "--output", outPath,
      "--ffmpeg-location", ffmpegPath,
      "--no-abort-on-error",
    ];


    const args = [...baseArgs];

    if (fileType === "audio") {
          args.push(
            '--format', 'bestaudio/best',
            "--extract-audio",
            '--audio-quality', '0',
          );
        } else {
          args.push(
            "--format", "best",
            "--recode-video", "mp4",
          );
        }
    const subprocess = spawn("/usr/local/bin/yt-dlp", args);

    subprocess.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(/(\d{1,3}\.\d)%/);
      if (match) {
        const pct = Math.min(95, Math.floor(parseFloat(match[1])));
        tasks.update(taskId, { progress: pct, message: `downloading ${pct}%` });
        logger.info(`⏳ Progress: ${pct}%`);
      }
    });

    subprocess.stderr.on("data", (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (msg.includes("Requested format is not available")) {
        logger.warn(`[yt-dlp stderr]: ${msg}`);
      } else {
        logger.info(`[yt-dlp stderr]: ${msg}`);
      }
    });

    subprocess.on("error", (err) => {
      logger.error("❌ yt-dlp process error", err);
      resolve(false);
    });

    subprocess.on("close", (code) => {
      logger.info(`[yt-dlp] Process closed with code: ${code}`);
      resolve(code === 0);
    });
  });
}