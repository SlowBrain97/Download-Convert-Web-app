import path from "node:path";
import fs, { existsSync } from "node:fs";
import got from "got";
import { spawn } from "node:child_process";
import { tasks } from "../utils/taskManager.js";
import { getPublicUrl, toPublicPath, ensureTempDir } from "../utils/file.js";
import { logger } from "../utils/logger.js";
import { ffmpegPath } from "../utils/getFfmpegPath.js";
import { cookiesPath } from "../utils/cookiesPath.js";

// Rate limiting: track last download time
let lastDownloadTime = 0;
const MIN_DELAY_MS = 5000; // 5 seconds minimum between downloads

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
      "--geo-bypass",
      "--extractor-args", "youtube:player_client=web;youtubetab:skip=authcheck",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/120.0.0.0 Safari/537.36",
      "--add-header", "Referer: https://www.youtube.com/",
      "--ffmpeg-location", ffmpegPath,
      "--socket-timeout", "30",
      "--retries", "3",
      "--output", outPath,
    ];

    if (fileType === "audio") {
      baseArgs.push(
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio'
      );
    } else {
      baseArgs.push(
        "--format",
        "bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--postprocessor-args", "-c:v copy -c:a aac"
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
      logger.warn(`[yt-dlp stderr]: ${msg}`);

      if (msg.includes("ERROR")) {
        if (msg.includes("403")) {
          tasks.error(taskId, "YouTube blocked the request (403 Forbidden). Try again later or use a different approach.");
        } else if (msg.includes("404")) {
          tasks.error(taskId, "Video not found or unavailable (404).");
        } else if (msg.includes("Sign in to confirm")) {
          tasks.error(taskId, "Video requires authentication. Please provide valid YouTube cookies.");
        } else if (msg.includes("Video unavailable")) {
          tasks.error(taskId, "Video is unavailable in your region or has been removed.");
        } else if (msg.includes("age")) {
          tasks.error(taskId, "Video is age-restricted. Authentication may be required.");
        } else {
          tasks.error(taskId, `Download failed: ${msg}`);
        }
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

    // Rate limiting: ensure minimum delay between downloads
    const now = Date.now();
    const timeSinceLastDownload = now - lastDownloadTime;
    if (timeSinceLastDownload < MIN_DELAY_MS) {
      const delay = MIN_DELAY_MS - timeSinceLastDownload;
      logger.info(`⏳ Rate limiting: waiting ${delay}ms before download`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

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
      lastDownloadTime = Date.now(); // Update rate limiting timestamp

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