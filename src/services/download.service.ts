import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { tasks } from "../utils/taskManager.js";
import { getPublicUrl, toPublicPath, ensureTempDir } from "../utils/file.js";
import { logger } from "../utils/logger.js";
import { ffmpegPath } from "../utils/getFfmpegPath.js";
import { cookiesPath } from "../utils/cookiesPath.js";


function isYouTube(url: string) {
  return /(?:youtube\.com|youtu\.be)\//i.test(url);
}

// async function downloadWithArgs(
//   url: string,
//   outPath: string, 
//   cookiesPath: string,
//   fileType: 'video' | 'audio',
//   taskId: string,
// ): Promise<boolean> {
//   return new Promise((resolve) => {
//     const baseArgs = [
//        url,
//       "--no-warnings",
//       "--cookies", cookiesPath,
//       "--geo-bypass",
//       "--extractor-args", "youtube:player_client=web;youtubetab:skip=authcheck",
//       "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
//         "AppleWebKit/537.36 (KHTML, like Gecko) " +
//         "Chrome/120.0.0.0 Safari/537.36",
//       "--add-header", "Referer: https://www.youtube.com/",
//       "--ffmpeg-location", ffmpegPath,
//       "--socket-timeout", "30",
//       "--retries", "3",
//       "--output", outPath,
//     ];

//     if (fileType === "audio") {
//       baseArgs.push(
//         '-x',
//         '--audio-format', 'mp3',
//         '--audio-quality', '0',
//         '--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio'
//       );
//     } else {
//       baseArgs.push(
//         "--format",
//         "bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4]/best",
//         "--merge-output-format", "mp4",
//         "--postprocessor-args", "-c:v copy -c:a aac"
//       );
//     }

//     const subprocess = spawn("/usr/local/bin/yt-dlp", baseArgs);
//     tasks.update(taskId, { 
//             status: 'processing', 
//             message: 'Getting file from url',
//     });
//     subprocess.stdout.on("data", (chunk: Buffer) => {
//       const text = chunk.toString();
//       const match = text.match(/(\d{1,3}\.\d)%/);
//       if (match) {
//         const pct = Math.min(99, Math.floor(parseFloat(match[1])));
//         tasks.update(taskId, { 
//           progress: pct, 
//           message: `downloading ${pct}%` 
//         });
//       }
//     });

//     subprocess.stderr.on("data", (chunk: Buffer) => {
//       const msg = chunk.toString().trim();
//       logger.warn(`[yt-dlp stderr]: ${msg}`);

//       if (msg.includes("ERROR")) {
//         if (msg.includes("403")) {
//           tasks.error(taskId, "YouTube blocked the request (403 Forbidden). Try again later or use a different approach.");
//         } else if (msg.includes("404")) {
//           tasks.error(taskId, "Video not found or unavailable (404).");
//         } else if (msg.includes("Sign in to confirm")) {
//           tasks.error(taskId, "Video requires authentication. Please provide valid YouTube cookies.");
//         } else if (msg.includes("Video unavailable")) {
//           tasks.error(taskId, "Video is unavailable in your region or has been removed.");
//         } else if (msg.includes("age")) {
//           tasks.error(taskId, "Video is age-restricted. Authentication may be required.");
//         } else {
//           tasks.error(taskId, `Download failed: ${msg}`);
//         }
//         resolve(false);
//       }
//     });

//     subprocess.on("error", (err) => {
//       logger.error("yt-dlp process error", err);
//       resolve(false);
//     });

//     subprocess.on("close", (code) => {
//       logger.info(`Download attempt finished with code: ${code}`);
//       resolve(code === 0);
//     });
//   });
// }

// export async function downloadTask(
//   taskId: string,
//   url: string,
//   fileType: 'video' | 'audio' = 'video'
// ) {
//   try {
//     ensureTempDir();

//     // Rate limiting: ensure minimum delay between downloads
//     const now = Date.now();
//     const timeSinceLastDownload = now - lastDownloadTime;
//     if (timeSinceLastDownload < MIN_DELAY_MS) {
//       const delay = MIN_DELAY_MS - timeSinceLastDownload;
//       logger.info(`⏳ Rate limiting: waiting ${delay}ms before download`);
//       await new Promise(resolve => setTimeout(resolve, delay));
//     }

//     if (isYouTube(url)) {
//       const titleSafe = `download-${Date.now()}`;
//       const ext = fileType === 'audio' ? 'mp3' : 'mp4';
//       const outName = `${titleSafe}.${ext}`;
//       const outPath = path.resolve(toPublicPath(outName));
//       const outDir = path.dirname(outPath);
//       tasks.update(taskId, { 
//         status: 'processing', 
//         message: 'Got your url and ready to get file from url',
//       });
//       if (!fs.existsSync(outDir)) {
//         fs.mkdirSync(outDir, { recursive: true });
//       }

//       const success = await downloadWithArgs(url, outPath, cookiesPath, fileType, taskId);

//       if (!success) {
//         if (!existsSync(outPath)) {
//           throw new Error(
//             'Cant get file from this url'
//           );
//         }
//       }
//       tasks.update(taskId, { message: 'Got file from url, waiting for file to be fully written' });
//       // Wait for file to be fully written
//       const maxRetries = 10;
//       let retries = 0;
//       while (retries < maxRetries && !existsSync(outPath)) {
//         await new Promise(r => setTimeout(r, 300));
//         retries++;
//         logger.info(`⏳ Waiting for file... (${retries}/${maxRetries})`);
//       }

//       if (!existsSync(outPath)) {
//         throw new Error(`File not found after waiting: ${outPath}`);
//       }

//       const stat = await fs.promises.stat(outPath);
      
//       logger.info(`✅ Download completed: ${stat.size} bytes`);
//       lastDownloadTime = Date.now(); // Update rate limiting timestamp

//       tasks.complete(taskId, {
//         downloadUrl: getPublicUrl(path.basename(outPath)),
//         filePath: outPath,
//         fileName: path.basename(outPath),
//         size: stat.size,
//       });
      
//       return;
//     }
//   } catch (err: any) {
//     logger.error('downloadTask failed', err);
//     tasks.error(taskId, err?.message || 'Download failed');
//   }
// }

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
      
      // Critical: Use newest extraction methods
      "--extractor-args", "youtube:player_client=ios,web_creator",
      
      // Bypass geo-restrictions
      "--geo-bypass",
      
      // iOS User-Agent (more reliable than web)
      "--user-agent", 
      "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
      
      // Additional headers to mimic real iOS app
      "--add-header", "Accept: */*",
      "--add-header", "Accept-Language: en-US,en;q=0.9",
      "--add-header", "Accept-Encoding: gzip, deflate",
      "--add-header", "X-YouTube-Client-Name: 5",
      "--add-header", "X-YouTube-Client-Version: 19.09.3",
      
      // Network settings
      "--socket-timeout", "30",
      "--retries", "5",
      "--fragment-retries", "5",
      
      // FFmpeg location
      "--ffmpeg-location", ffmpegPath,
      
      // Output
      "--output", outPath,
    ];

    if (fileType === "audio") {
      baseArgs.push(
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        // Prioritize m4a (native iOS format)
        '--format', 'bestaudio[ext=m4a]/bestaudio'
      );
    } else {
      baseArgs.push(
        // Use simpler format selector to avoid 403
        // iOS client typically has pre-merged formats
        "--format", 
        // Priority 1: Best quality mp4 with audio
        "best[ext=mp4][height<=1080]/" +
        // Priority 2: Any best with audio
        "best[height<=1080]/" +
        // Priority 3: Fallback to any best
        "best",
        
        // Merge if needed
        "--merge-output-format", "mp4"
      );
    }

    logger.info(`Starting download with iOS client strategy`);
    
    const subprocess = spawn("/usr/local/bin/yt-dlp", baseArgs);
    
    tasks.update(taskId, { 
      status: 'processing', 
      message: 'Connecting to YouTube...',
    });

    let hasOutput = false;

    subprocess.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      hasOutput = true;
      
      logger.info(`[yt-dlp]: ${text.trim()}`);
      
      // Update progress
      const match = text.match(/(\d{1,3}\.\d)%/);
      if (match) {
        const pct = Math.min(95, Math.floor(parseFloat(match[1])));
        tasks.update(taskId, { 
          progress: pct, 
          message: `Downloading ${pct}%` 
        });
      }
      
      // Check for download start
      if (text.includes('[download]') && text.includes('Destination:')) {
        tasks.update(taskId, { 
          message: 'Download started...' 
        });
      }
    });

    subprocess.stderr.on("data", (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      logger.info(`[yt-dlp stderr]: ${msg}`);
      
      // Don't log deprecation warnings as errors
      if (msg.includes('Deprecated') || msg.includes('WARNING')) {
        return;
      }
      
      if (msg.includes("ERROR") || msg.includes("403")) {
        logger.warn(`[yt-dlp ERROR]: ${msg}`);
      }
    });

    subprocess.on("error", (err) => {
      logger.error("yt-dlp process error:", err);
      resolve(false);
    });

    subprocess.on("close", (code) => {
      logger.info(`Download attempt finished with code: ${code}`);
      
      // Even if exit code is 0, check if file actually exists
      if (code === 0 && hasOutput) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

// Enhanced download with multiple fallback strategies
async function tryDownloadWithFallbacks(
  url: string, 
  outPath: string, 
  cookiesPath: string,
  fileType: 'video' | 'audio',
  taskId: string
): Promise<boolean> {
  
  // Strategy 1: iOS client (most reliable now)
  logger.info('🔄 Strategy 1: iOS client');
  let success = await downloadWithArgs(url, outPath, cookiesPath, fileType, taskId);
  
  if (success && fs.existsSync(outPath)) {
    const size = fs.statSync(outPath).size;
    if (size > 1000) {
      logger.info('✅ Success with iOS client!');
      return true;
    }
  }
  
  // Strategy 2: Web Creator client (new alternative)
  logger.info('🔄 Strategy 2: Web Creator client');
  
  // Update args for web_creator
  const baseArgs2 = [
    url,
    "--no-warnings",
    "--cookies", cookiesPath,
    "--extractor-args", "youtube:player_client=web_creator",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "--socket-timeout", "30",
    "--retries", "5",
    "--ffmpeg-location", ffmpegPath,
    "--output", outPath,
  ];

  if (fileType === "audio") {
    baseArgs2.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    baseArgs2.push(
      "--format", "best[ext=mp4]/best",
      "--merge-output-format", "mp4"
    );
  }

  const subprocess2 = spawn("/usr/local/bin/yt-dlp", baseArgs2);
  
  success = await new Promise<boolean>((resolve) => {
    subprocess2.on("close", (code) => {
      resolve(code === 0 && fs.existsSync(outPath));
    });
  });

  if (success) {
    logger.info('✅ Success with Web Creator client!');
    return true;
  }

  // Strategy 3: Android client (last resort)
  logger.info('🔄 Strategy 3: Android client (testsuite)');
  
  const baseArgs3 = [
    url,
    "--no-warnings",
    "--cookies", cookiesPath,
    "--extractor-args", "youtube:player_client=android_testsuite",
    "--socket-timeout", "30",
    "--retries", "5",
    "--ffmpeg-location", ffmpegPath,
    "--output", outPath,
  ];

  if (fileType === "audio") {
    baseArgs3.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    baseArgs3.push(
      "--format", "best",
      "--merge-output-format", "mp4"
    );
  }

  const subprocess3 = spawn("/usr/local/bin/yt-dlp", baseArgs3);
  
  success = await new Promise<boolean>((resolve) => {
    subprocess3.on("close", (code) => {
      resolve(code === 0 && fs.existsSync(outPath));
    });
  });

  if (success) {
    logger.info('✅ Success with Android testsuite client!');
    return true;
  }

  // Strategy 4: Try without cookies (for public videos)
  logger.info('🔄 Strategy 4: No cookies (public video fallback)');
  
  const baseArgs4 = [
    url,
    "--no-warnings",
    // No cookies
    "--extractor-args", "youtube:player_client=ios",
    "--user-agent", "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
    "--socket-timeout", "30",
    "--ffmpeg-location", ffmpegPath,
    "--output", outPath,
  ];

  if (fileType === "audio") {
    baseArgs4.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    baseArgs4.push("--format", "best[ext=mp4]/best");
  }

  const subprocess4 = spawn("/usr/local/bin/yt-dlp", baseArgs4);
  
  success = await new Promise<boolean>((resolve) => {
    subprocess4.on("close", (code) => {
      resolve(code === 0 && fs.existsSync(outPath));
    });
  });

  if (success) {
    logger.info('✅ Success without cookies!');
    return true;
  }

  return false;
}

// Update main download function
export async function downloadTask(
  taskId: string,
  url: string,
  fileType: 'video' | 'audio' = 'video'
) {
  try {
    ensureTempDir();
    
    tasks.update(taskId, { 
      status: 'processing', 
      message: 'Initializing download...', 
      progress: 0
    });

    if (isYouTube(url)) {
      const titleSafe = `download-${Date.now()}`;
      const ext = fileType === 'audio' ? 'mp3' : 'mp4';
      const outName = `${titleSafe}.${ext}`;
      const outPath = path.resolve(toPublicPath(outName));
      const outDir = path.dirname(outPath);

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const cookiesPath = '/tmp/cookies.txt';
      if (process.env.YT_COOKIES_BASE64) {
        const cookiesContent = Buffer.from(
          process.env.YT_COOKIES_BASE64, 
          'base64'
        ).toString('utf-8');
        fs.writeFileSync(cookiesPath, cookiesContent);
        logger.info('✅ Cookies loaded');
      } else {
        logger.warn('⚠️ No cookies - may fail for restricted videos');
      }

      // Try download with multiple strategies
      const success = await tryDownloadWithFallbacks(
        url,
        outPath,
        cookiesPath,
        fileType,
        taskId
      );

      if (!success || !fs.existsSync(outPath)) {
        throw new Error(
          'Download failed after trying all strategies. Possible reasons:\n' +
          '• Video is private or deleted\n' +
          '• Video is age-restricted (requires valid cookies)\n' +
          '• Video is geo-blocked in your region\n' +
          '• YouTube is blocking automated downloads\n' +
          '• Cookies have expired'
        );
      }

      // Wait for file to be fully written
      await new Promise(r => setTimeout(r, 1000));

      const stat = await fs.promises.stat(outPath);
      
      if (stat.size < 1000) {
        throw new Error(`File too small (${stat.size} bytes) - download incomplete`);
      }

      logger.info(`✅ Download completed: ${stat.size} bytes`);

      tasks.complete(taskId, {
        downloadUrl: getPublicUrl(path.basename(outPath)),
        filePath: outPath,
        fileName: path.basename(outPath),
        size: stat.size,
      });
      
      return;
    }

    // Non-YouTube downloads
    // ... (existing code)

  } catch (err: any) {
    logger.error('downloadTask failed:', err);
    tasks.error(taskId, err?.message || 'Download failed');
  }
}

// Optional: Check if yt-dlp needs update
export async function checkYtDlpVersion() {
  return new Promise<string>((resolve) => {
    const subprocess = spawn("/usr/local/bin/yt-dlp", ["--version"]);
    let version = '';
    
    subprocess.stdout.on("data", (chunk: Buffer) => {
      version = chunk.toString().trim();
    });
    
    subprocess.on("close", () => {
      logger.info(`yt-dlp version: ${version}`);
      resolve(version);
    });
  });
}

// Update yt-dlp to latest version (call này trong startup)
export async function updateYtDlp() {
  return new Promise<boolean>((resolve) => {
    logger.info('Updating yt-dlp to latest version...');
    
    const subprocess = spawn("pip3", [
      "install",
      "--upgrade",
      "--break-system-packages",
      "yt-dlp"
    ]);
    
    subprocess.stdout.on("data", (chunk: Buffer) => {
      logger.info(`[pip]: ${chunk.toString().trim()}`);
    });
    
    subprocess.on("close", (code) => {
      if (code === 0) {
        logger.info('✅ yt-dlp updated successfully');
        resolve(true);
      } else {
        logger.warn('⚠️ yt-dlp update failed');
        resolve(false);
      }
    });
  });
}