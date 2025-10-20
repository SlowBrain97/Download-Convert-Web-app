import path from "node:path";
import fs, { existsSync } from "node:fs";
import got from "got";
import { spawn } from "node:child_process";
import { tasks } from "../utils/taskManager.js";
import { getPublicUrl, toPublicPath, ensureTempDir } from "../utils/file.js";
import { logger } from "../utils/logger.js";
import { ffmpegPath } from "../utils/getFfmpegPath.js";
import { cookiesPath } from "../utils/cookiesPath.js";


function isYouTube(url: string) {
  return /(?:youtube\.com|youtu\.be)\//i.test(url);
}

async function downloadWithArgs(
  url: string,
  outPath: string, 
  cookiesPath: string,
  fileType: 'video' | 'audio',
  taskId: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const baseArgs = [
      url,
      "--no-warnings",
      "--cookies", cookiesPath,
      "--extractor-args", "youtube:player_client=web",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "--add-header", "Accept-Language: en-US,en;q=0.9",
      "--add-header", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "--add-header", "Referer: https://www.youtube.com/",
      "--geo-bypass",
      "--output", outPath,
      "--ffmpeg-location", ffmpegPath,
    ];

    if (fileType === "audio") {
      baseArgs.push(
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--format', 'bestaudio/best'
      );
    } else {
      baseArgs.push(
        "--format", 
        "bv*[ext=mp4][vcodec^=avc]+ba[ext=m4a][acodec^=mp4a]/" +
        "bv*[ext=mp4]+ba[ext=m4a]/" +
        "bv*+ba/" +
        "b[ext=mp4][vcodec^=avc][acodec^=mp4a]/" +
        "bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]" +
        "b",
        "--postprocessorArgs", ["-c:v", "copy", "-c:a", "aac"],
        "--merge-output-format", "mp4",
      );
    }

    const subprocess = spawn("/usr/local/bin/yt-dlp", baseArgs);
    tasks.update(taskId, { 
            status: 'processing', 
            message: 'Getting file from url',
    });
    subprocess.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(/(\d{1,3}\.\d)%/);
      if (match) {
        const pct = Math.min(99, Math.floor(parseFloat(match[1])));
        tasks.update(taskId, { 
          progress: pct, 
          message: `downloading ${pct}%` 
        });
      }
    });

    subprocess.stderr.on("data", (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (msg.includes("ERROR")) {
        logger.warn(`[yt-dlp]: ${msg}`);
        tasks.error(taskId, "Sorry, something went wrong");
        resolve(false);
      }
    });

    subprocess.on("error", (err) => {
      logger.error("yt-dlp process error", err);
      resolve(false);
    });

    subprocess.on("close", (code) => {
      logger.info(`Download attempt finished with code: ${code}`);
      resolve(code === 0);
    });
  });
}

export async function downloadTask(
  taskId: string,
  url: string,
  fileType: 'video' | 'audio' = 'video'
) {
  try {
    ensureTempDir();
    
    if (isYouTube(url)) {
      const titleSafe = `download-${Date.now()}`;
      const ext = fileType === 'audio' ? 'mp3' : 'mp4';
      const outName = `${titleSafe}.${ext}`;
      const outPath = path.resolve(toPublicPath(outName));
      const outDir = path.dirname(outPath);
      tasks.update(taskId, { 
        status: 'processing', 
        message: 'Got your url and ready to get file from url',
      });
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const success = await downloadWithArgs(url, outPath, cookiesPath, fileType, taskId);

      if (!success) {
        if (!existsSync(outPath)) {
          throw new Error(
            'Cant get file from this url'
          );
        }
      }
      tasks.update(taskId, { message: 'Got file from url, waiting for file to be fully written' });
      // Wait for file to be fully written
      const maxRetries = 10;
      let retries = 0;
      while (retries < maxRetries && !existsSync(outPath)) {
        await new Promise(r => setTimeout(r, 300));
        retries++;
        logger.info(`⏳ Waiting for file... (${retries}/${maxRetries})`);
      }

      if (!existsSync(outPath)) {
        throw new Error(`File not found after waiting: ${outPath}`);
      }

      const stat = await fs.promises.stat(outPath);
      
      logger.info(`✅ Download completed: ${stat.size} bytes`);

      tasks.complete(taskId, {
        downloadUrl: getPublicUrl(path.basename(outPath)),
        filePath: outPath,
        fileName: path.basename(outPath),
        size: stat.size,
      });
      
      return;
    }
  } catch (err: any) {
    logger.error('downloadTask failed', err);
    tasks.error(taskId, err?.message || 'Download failed');
  }
}