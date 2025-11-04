import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { tasks } from "../utils/taskManager.js";
import { getPublicUrl, toPublicPath, ensureTempDir } from "../utils/file.js";
import { logger } from "../utils/logger.js";
import { ffmpegPath } from "../utils/getFfmpegPath.js";
import { cookiesPath } from "../utils/cookiesPath.js";

const YT_DLP = "/usr/local/bin/yt-dlp";

type Strategy = {
  name: string;
  id: string;
  args: (cookiesPath?: string) => string[];
};

const STRATEGIES: Strategy[] = [
  {
    name: "Android client",
    id: "android_testsuite",
    args: (cookiesPath?: string) => [
      "--no-warnings",
      "--geo-bypass",
      "--cookies", cookiesPath!,
      "--extractor-args", "youtube:player_client=android_testsuite",
    ],
  },
  {
    name: "Android Music client",
    id: "android_music",
    args: (cookiesPath?: string) => [
      "--no-warnings",
      "--geo-bypass",
      "--cookies", cookiesPath!,
      "--extractor-args", "youtube:player_client=android_music,web_creator",
    ],
  },

  {
    name: "Web Creator client",
    id: "web_creator",
    args: (cookiesPath?: string) => [
      "--no-warnings",
      "--geo-bypass",
      "--cookies", cookiesPath!,
      "--extractor-args", "youtube:player_client=web_creator",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ],
  },

  {
    name: "iOS client",
    id: "ios",
    args: (cookiesPath?: string) => [
      "--no-warnings",
      "--geo-bypass",
      "--cookies", cookiesPath!,
      "--extractor-args", "youtube:player_client=ios,web_creator",
      "--user-agent", "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
      "--add-header", "X-YouTube-Client-Name: 5",
      "--add-header", "X-YouTube-Client-Version: 19.09.3",
    ],
  },

  {
    name: "No cookie fallback",
    id: "no_cookie",
    args: () => [
      "--no-warnings",
      "--geo-bypass",
      "--extractor-args", "youtube:player_client=ios",
      "--user-agent", "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
    ],
  },
];


async function runYtDlp(
  url: string,
  args: string[],
  outPath: string,
  taskId: string
): Promise<boolean> {
  return new Promise((resolve) => {
    let hasOutput = false;

    const subprocess = spawn(YT_DLP, [
      ...args,
      "--ffmpeg-location", ffmpegPath,
      "--output", outPath,
      "--no-playlist",
      url,
    ]);

    subprocess.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      hasOutput = true;

      const match = text.match(/(\d{1,3}\.\d)%/);
      if (match) {
        const pct = Math.min(99, Math.floor(parseFloat(match[1])));
        tasks.update(taskId, { progress: pct, message: `Downloading ${pct}%` });
      }

      if (text.includes("Destination:")) {
        tasks.update(taskId, { message: "Download started..." });
      }

      logger.info(`[yt-dlp]: ${text.trim()}`);
    });

    subprocess.stderr.on("data", (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (!msg.includes("Deprecated") && !msg.includes("WARNING")) {
        logger.warn(`[yt-dlp ERROR]: ${msg}`);
      }
    });

    subprocess.on("error", (err) => {
      logger.error("yt-dlp process error:", err);
      resolve(false);
    });

    subprocess.on("close", (code) => {
      logger.info(`yt-dlp exited with code ${code}`);
      resolve(code === 0 && fs.existsSync(outPath) && hasOutput);
    });
  });
}

async function tryDownloadWithFallbacks(
  url: string,
  outPath: string,
  fileType: "video" | "audio",
  taskId: string
): Promise<boolean> {
  for (const strategy of STRATEGIES) {
    logger.info(`🔄 Strategy: ${strategy.name}`);
    tasks.update(taskId, {
      status: "queued",
      message: `Trying ${strategy.name}...`,
    });

    const args = strategy.args(strategy.id === "no_cookie" ? undefined : cookiesPath);

    if (fileType === "audio") {
      args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
    } else {
      args.push("--format", "best[ext=mp4][height<=720]/best", "--merge-output-format", "mp4");
    }

    const success = await runYtDlp(url, args, outPath, taskId);
    if (success) {
      const size = fs.statSync(outPath).size;
        if (size > 500) {
          logger.info(`✅ Success with ${strategy.name}!`);
          return true;
        }
    }
  }
  return false;
}

export default async function youtubeDownloadTask(
  taskId: string,
  url: string,
  fileType: "video" | "audio" = "video"
) {
  try {
    ensureTempDir();

    tasks.update(taskId, {
      status: "processing",
      message: "Initializing download...",
      progress: 0,
    });

    if (!/(?:youtube\.com|youtu\.be)\//i.test(url)) {
      throw new Error("Unsupported URL");
    }

    const titleSafe = `download-${Date.now()}`;
    const ext = fileType === "audio" ? "mp3" : "mp4";
    const outPath = path.resolve(toPublicPath(`${titleSafe}.${ext}`));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const success = await tryDownloadWithFallbacks(url, outPath, fileType, taskId);
    if (!success) {
      throw new Error("All strategies failed. Check cookies or geo-block restrictions.");
    }
    tasks.update(taskId, {
      status: "ready",
      message: "Congratulations! File downloaded. Now,creating file to ready for download.",
      progress: 99,
    });
    const stat = await fs.promises.stat(outPath);
    if (stat.size < 1000) throw new Error("File too small — incomplete download");

    logger.info(`✅ Download completed: ${stat.size} bytes`);
    tasks.complete(taskId, {
      downloadUrl: getPublicUrl(path.basename(outPath)),
      filePath: outPath,
      fileName: path.basename(outPath),
      size: stat.size,
    });
  } catch (err: any) {
    logger.error("downloadTask failed:", err);
    tasks.error(taskId, err?.message || "Download failed");
  }
}
