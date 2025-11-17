import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { tasks } from "../utils/taskManager.js";
import { getPublicUrl, toPublicPath, ensureTempDir } from "../utils/file.js";
import { logger } from "../utils/logger.js";
import { instaCookiesPath } from "../utils/instagramCookiesSession.js";
import { ffmpegPath } from "../utils/getFfmpegPath.js";

const INSTALOADER = "/usr/local/bin/instaloader";

type Strategy = {
  name: string;
  id: string;
  args: (shortcode: string, outDir: string) => string[];
};

const STRATEGIES: Strategy[] = [
  {
    name: "Session with cookies file",
    id: "session",
    args: (shortcode, outDir) => [
      "--sessionfile", instaCookiesPath,
      "--no-captions",
      "--no-compress-json",
      "--dirname-pattern", outDir,
      "--filename-pattern", "{shortcode}",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--quiet",
      "--no-metadata-json",
      "--",
      `-${shortcode}`,
    ],
  },
  {
    name: "Cookies file fallback",
    id: "cookies",
    args: (shortcode, outDir) => [
      "--cookiefile", instaCookiesPath,
      "--no-captions",
      "--no-compress-json",
      "--dirname-pattern", outDir,
      "--filename-pattern", "{shortcode}",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--quiet",
      "--no-metadata-json",
      "--",
      `-${shortcode}`,
    ],
  },
  {
    name: "Anonymous (no login)",
    id: "anon",
    args: (shortcode, outDir) => [
      "--no-captions",
      "--no-compress-json",
      "--dirname-pattern", outDir,
      "--filename-pattern", "{shortcode}",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--quiet",
      "--no-metadata-json",
      "--",
      `-${shortcode}`,
    ],
  },
];


function extractShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv|reels)\/([A-Za-z0-9_-]+)/i);
  if (match) {
    return match[1];
  }
  
  // Support instagr.am short URLs
  const shortMatch = url.match(/instagr\.am\/p\/([A-Za-z0-9_-]+)/i);
  if (shortMatch) {
    return shortMatch[1];
  }
  
  return null;
}

/**
 * Detect content type from URL
 */
function getContentType(url: string): string {
  if (url.includes('/reel/')) return 'reel';
  if (url.includes('/tv/')) return 'igtv';
  if (url.includes('/p/')) return 'post';
  return 'content';
}

/**
 * Run instaloader command
 */
async function runInstaloader(
  args: string[],
  outDir: string,
  taskId: string
): Promise<boolean> {
  return new Promise((resolve) => {
    let hasOutput = false;

    const subprocess = spawn(INSTALOADER, args);

    subprocess.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      logger.info(`[instaloader]: ${text.trim()}`);

      if (!hasOutput && /Downloading/.test(text)) {
        hasOutput = true;
        tasks.update(taskId, { message: "Download started..." });
      }

      const pctMatch = text.match(/(\d{1,3})%/);
      if (pctMatch) {
        const pct = Math.min(95, parseInt(pctMatch[1]));
        tasks.update(taskId, { status: "processing",progress: pct, message: `Downloading ${pct}%` });
      }
    });

    subprocess.stderr.on("data", (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (msg && !msg.includes("WARNING") && !msg.includes("Deprecated")) {
        logger.warn(`[instaloader ERROR]: ${msg}`);
      }
    });

    subprocess.on("error", (err) => {
      logger.error("Instaloader process error:", err);
      resolve(false);
    });

    subprocess.on("close", (code) => {
      logger.info(`Instaloader exited with code ${code}`);

      // Check if video file exists
      const files = fs.existsSync(outDir)
        ? fs.readdirSync(outDir).filter(f => f.endsWith(".mp4") || f.endsWith(".jpg"))
        : [];

      resolve(code === 0 && files.length > 0);
    });
  });
}

/**
 * Try download with fallback strategies
 */
async function tryDownloadWithFallbacks(
  shortcode: string,
  outDir: string,
  taskId: string
): Promise<boolean> {
  for (let i = 0; i < STRATEGIES.length; i++) {
    const strategy = STRATEGIES[i];
    
    logger.info(`🔄 Strategy: ${strategy.name}`);
    tasks.update(taskId, {
      status: "trying",
      message: `Trying ${strategy.name}...`,
    });

    const args = strategy.args(shortcode, outDir);
    const success = await runInstaloader(args, outDir, taskId);

    if (success) {
      logger.info(`✅ Success with ${strategy.name}`);
      return true;
    }

    logger.warn(`❌ Failed with ${strategy.name}`);

    if (i < STRATEGIES.length - 1) {
      logger.info("⏳ Waiting 5s before next attempt...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return false;
}


async function convertToAudio(videoPath: string, outDir: string): Promise<string> {
  const audioPath = path.join(outDir, `${path.parse(videoPath).name}.mp3`);
  
  return new Promise((resolve, reject) => {
    const convertProcess = spawn(ffmpegPath, [
      '-i', videoPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-b:a', '192k',
      '-y',
      audioPath,
    ]);

    convertProcess.stderr.on('data', (chunk) => {
      logger.info(`[ffmpeg]: ${chunk.toString().trim()}`);
    });

    convertProcess.on('close', code => {
      if (code === 0 && fs.existsSync(audioPath)) {
        resolve(audioPath);
      } else {
        reject(new Error(`FFmpeg conversion failed with code ${code}`));
      }
    });

    convertProcess.on('error', err => reject(err));
  });
}


export default async function instagramDownloadTask(
  taskId: string,
  url: string,
  fileType: 'video' | 'audio' = 'video'
) {
  try {
    ensureTempDir();

    tasks.update(taskId, {
      status: "processing",
      message: "Initializing Instagram download...",
      progress: 0,
    });

    // Validate URL
    if (!/instagram\.com\/(?:p|reel|tv|reels)\//i.test(url)) {
      throw new Error("Unsupported URL — must be an Instagram post/reel/IGTV");
    }

    // Extract shortcode
    const shortcode = extractShortcode(url);
    if (!shortcode) {
      throw new Error("Invalid Instagram URL format");
    }

    const contentType = getContentType(url);
    logger.info(`📥 Downloading Instagram ${contentType}: ${shortcode}`);

    // Create output directory
    const outDir = path.resolve(toPublicPath(`insta-${Date.now()}`));
    fs.mkdirSync(outDir, { recursive: true });

    // Download with fallback strategies
    const success = await tryDownloadWithFallbacks(shortcode, outDir, taskId);
    if (!success) {
      throw new Error("All strategies failed. Check cookies or session file");
    }

    // Find downloaded video file (sort by newest first)
    const mp4Files = fs.readdirSync(outDir)
      .filter(f => f.endsWith(".mp4"))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(outDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (mp4Files.length === 0) {
      // Check if only images were downloaded (no video content)
      const jpgFiles = fs.readdirSync(outDir).filter(f => f.endsWith(".jpg"));
      if (jpgFiles.length > 0) {
        throw new Error("This Instagram post contains only images, no video available");
      }
      throw new Error("No video file found after download");
    }

    let finalPath = path.join(outDir, mp4Files[0].name);
    let finalName = mp4Files[0].name;

    // Convert to audio if requested
    if (fileType === 'audio') {
      tasks.update(taskId, {
        status: "processing",
        message: "Converting to audio...",
        progress: 95,
      });

      try {
        const audioPath = await convertToAudio(finalPath, outDir);
        
        // Delete original video file
        fs.unlinkSync(finalPath);
        
        finalPath = audioPath;
        finalName = path.basename(audioPath);
        
        logger.info(`✅ Converted to audio: ${finalName}`);
      } catch (err) {
        logger.error("Audio conversion failed:", err);
        throw new Error("Audio conversion failed. Please try downloading as video");
      }
    }

    // Verify file size
    const stat = await fs.promises.stat(finalPath);
    if (stat.size < 1000) {
      throw new Error("File too small — incomplete download");
    }

    logger.info(`✅ Instagram download completed: ${stat.size} bytes`);

    tasks.complete(taskId, {
      downloadUrl: getPublicUrl(path.relative(toPublicPath(""), finalPath)),
      filePath: finalPath,
      fileName: finalName,
      size: stat.size,
    });

  } catch (err: any) {
    logger.error("instagramDownloadTask failed:", err);
    tasks.error(taskId, err?.message || "Instagram download failed");
  }
}