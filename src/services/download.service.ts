import path from "node:path";
import fs, { existsSync } from "node:fs";
import got from "got";
import { spawn } from "node:child_process";
import { tasks } from "../utils/taskManager.js";
import { getPublicUrl, toPublicPath, ensureTempDir } from "../utils/file.js";
import { logger } from "../utils/logger.js";
import { ffmpegPath } from "./media.service.js";


function isYouTube(url: string) {
  return /(?:youtube\.com|youtu\.be)\//i.test(url);
}


function createCookiesFile(): string {
  const cookiesPath = "/tmp/cookies.txt";
  if (process.env.YT_COOKIES_BASE64) {
    try {
      const cookiesContent = Buffer.from(process.env.YT_COOKIES_BASE64, "base64").toString("utf-8");
      fs.writeFileSync(cookiesPath, cookiesContent);
      logger.info("✅ Cookies file written");
    } catch (err) {
      logger.warn("⚠️ Failed to write cookies file", err);
    }
  }
  return cookiesPath;
}

function runYtDlp(
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
    ];


    const args = [...baseArgs];

    if (fileType === "audio") {
          args.push(
            '-x',  
            '--audio-format', 'mp3',
            '--audio-quality', '0',
            '--format', 'bestaudio/best' 
          );
        } else {
          args.push(
            "--format", "best",
            "--merge-output-format", "mp4",
            "--recode-video", "mp4"  
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

export async function downloadTask(
  taskId: string,
  url: string,
  fileType: "video" | "audio" = "video"
) {
  try {
    ensureTempDir();
    tasks.update(taskId, { status: "processing", message: "Starting download", progress: 0 });


    if (isYouTube(url)) {
      const titleSafe = `download-${Date.now()}`;
      const ext = fileType === "audio" ? "mp3" : "mp4";
      const outName = `${titleSafe}.${ext}`;
      const outPath = path.resolve(toPublicPath(outName));

      fs.mkdirSync(path.dirname(outPath), { recursive: true });

      const cookiesPath = createCookiesFile();

      const ok = await runYtDlp(url, fileType, outPath, ffmpegPath, cookiesPath, taskId);
      if (!ok) throw new Error("yt-dlp failed to download or merge media");

      const maxRetries = 10;
      let retries = 0;
      while (retries < maxRetries && !existsSync(outPath)) {
        await new Promise((r) => setTimeout(r, 300));
        retries++;
        logger.info(`⏳ Waiting for file... (${retries}/${maxRetries})`);
      }

      if (!existsSync(outPath)) {
        throw new Error(`ENOENT: File not found after waiting: ${outPath}`);
      }

      const stats = fs.statSync(outPath);
      const sizeOk = stats.size > 1000;
      logger.info(`📦 File downloaded: ${outPath} (${stats.size} bytes)`);

      const buffer = Buffer.alloc(12);
      const fd = fs.openSync(outPath, "r");
      fs.readSync(fd, buffer, 0, 12, 0);
      fs.closeSync(fd);
      const hex = buffer.toString("hex").substring(0, 16);
      const validMp4 = hex.includes("6674797066747970");
      logger.info(`🔍 File signature: ${hex} | Valid MP4: ${validMp4}`);

      if (!sizeOk) logger.warn(`⚠️ File too small (${stats.size} bytes)`);

      const stat = await fs.promises.stat(outPath);
      tasks.complete(taskId, {
        downloadUrl: getPublicUrl(path.basename(outPath)),
        filePath: outPath,
        fileName: path.basename(outPath),
        size: stat.size,
      });
      return;
    }

    const outName = `download-${Date.now()}`;
    const extMatch = url.match(/\.([a-z0-9]{2,5})(?:$|[?#])/i);
    const extHttp = extMatch ? extMatch[1] : fileType === "audio" ? "mp3" : "mp4";
    const finalName = `${outName}.${extHttp}`;
    const outPath = path.resolve(toPublicPath(finalName));

    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    logger.info(`🌐 Direct download from ${url}`);

    await new Promise<void>((resolve, reject) => {
      const stream = got.stream(url);
      const write = fs.createWriteStream(outPath);

      stream.on("downloadProgress", (p: any) => {
        if (p.total) {
          const pct = Math.min(95, Math.floor((p.transferred / p.total) * 100));
          tasks.update(taskId, { progress: pct, message: `downloading ${pct}%` });
        }
      });

      stream.on("error", (err) => {
        logger.error("❌ Direct download stream error", err);
        reject(err);
      });
      write.on("error", reject);
      write.on("finish", resolve);
      stream.pipe(write);
    });

    const stat = await fs.promises.stat(outPath);
    logger.info(`✅ Direct download complete: ${outPath} (${stat.size} bytes)`);

    tasks.complete(taskId, {
      downloadUrl: getPublicUrl(path.basename(outPath)),
      filePath: outPath,
      fileName: path.basename(outPath),
      size: stat.size,
    });
  } catch (err: any) {
    logger.error("downloadTask failed", err);
    tasks.error(taskId, err?.message || "Download failed");
  }
}
