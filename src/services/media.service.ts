import path from 'node:path';
import fs from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';
import { tasks } from '../utils/taskManager.js';
import { getPublicUrl, toPublicPath } from '../utils/file.js';
import { logger } from '../utils/logger.js';
import {spawn} from 'node:child_process';


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
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log("🎬 Using ffmpeg at:", ffmpegPath);
} else {
  console.error("❌ No ffmpeg found! Install ffmpeg or ffmpeg-static.");
}

export async function convertMediaTask(taskId: string, inputPath: string, outputFormat: string) {
  try {
    tasks.update(taskId, { status: 'processing', message: 'Starting media conversion', progress: 5 });

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outFileName = `${baseName}.${outputFormat}`;
    const outPath = toPublicPath(outFileName);

    await new Promise<void>((resolve, reject) => {
      let lastPercent = 0;
      const child_process = spawn(ffmpegPath, [
        '-i', inputPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        outPath
      ]);
      child_process.stdout.on('data', (data: any) => {
        console.log(data.toString());
      });
      child_process.stderr.on('data', (data: any) => {
        console.error(data.toString());
      });
      child_process.on('close', () => {
        resolve();
      });
      ffmpeg(inputPath)
        .on('start', () => {
          tasks.update(taskId, { message: 'ffmpeg started', progress: 10 });
        })
        .on('progress', (p: any) => {
          console.log(p);
          const pct = Math.min(95, Math.max(10, Math.round(p.percent || 0)));
          if (Math.abs(pct - lastPercent) >= 1) {
            lastPercent = pct;
            tasks.update(taskId, { progress: pct, message: `processing ${pct}%` });
          }
        })
        .on('error', (err: any) => {
          reject(err);
        })
        .on('end', () => resolve())
        .output(outPath)
        .toFormat(outputFormat)
        .run();
    });

    const stat = await fs.promises.stat(outPath);
    const result = {
      downloadUrl: getPublicUrl(path.basename(outPath)),
      filePath: outPath,
      fileName: path.basename(outPath),
      size: stat.size,
    };

    tasks.complete(taskId, result);
  } catch (err: any) {
    logger.error('convertMediaTask failed', err);
    tasks.error(taskId, err?.message || 'Conversion failed');
  } finally {
    // clean input temp
    try { await fs.promises.unlink(inputPath); } catch {}
  }
}
