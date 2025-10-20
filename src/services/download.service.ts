import path from "node:path";
import fs, { existsSync } from "node:fs";
import got from "got";
import { spawn } from "node:child_process";
import { tasks } from "../utils/taskManager.js";
import { getPublicUrl, toPublicPath, ensureTempDir } from "../utils/file.js";
import { logger } from "../utils/logger.js";
import { ffmpegPath } from "../utils/getFfmpegPath.js";


function isYouTube(url: string) {
  return /(?:youtube\.com|youtu\.be)\//i.test(url);
}



// Kiểm tra formats có sẵn
async function checkAvailableFormats(
  url: string, 
  cookiesPath: string,
  clientArgs: string[]
): Promise<{ hasFormats: boolean; output: string }> {
  return new Promise((resolve) => {
    const args = [
      url,
      "--list-formats",
      "--cookies", cookiesPath,
      ...clientArgs,
    ];

    const subprocess = spawn("/usr/local/bin/yt-dlp", args);

    let output = '';
    let stderr = '';

    subprocess.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    subprocess.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    subprocess.on("close", (code) => {
      // Check for actual video/audio formats (not just storyboards)
      const hasRealFormats = 
        (output.includes('mp4') || output.includes('webm') || output.includes('m4a')) &&
        !output.includes('Only images are available');
      
      logger.info(`Format check: ${hasRealFormats ? 'Has real formats' : 'Only storyboards'}`);
      if (stderr) {
        logger.info(`Format check stderr: ${stderr}`);
      }
      
      resolve({ hasFormats: hasRealFormats, output });
    });
  });
}

// Download với args cụ thể
function downloadWithArgs(
  url: string,
  outPath: string, 
  cookiesPath: string,
  fileType: 'video' | 'audio',
  taskId: string,
  clientArgs: string[]
): Promise<boolean> {
  return new Promise((resolve) => {
    const baseArgs = [
      url,
      "--no-warnings",
      "--cookies", cookiesPath,
      ...clientArgs,
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
        "--format", "bv*+ba/b",
        "--merge-output-format", "mp4"
      );
    }

    logger.info(`Trying download with args: ${clientArgs.join(' ')}`);
    const subprocess = spawn("/usr/local/bin/yt-dlp", baseArgs);
    
    subprocess.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(/(\d{1,3}\.\d)%/);
      if (match) {
        const pct = Math.min(95, Math.floor(parseFloat(match[1])));
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

// Thử nhiều strategies
async function tryDownloadStrategies(
  url: string, 
  outPath: string, 
  cookiesPath: string,
  fileType: 'video' | 'audio',
  taskId: string
): Promise<boolean> {
  
  // Strategy 1: Web client với cookies (RECOMMENDED sau update)
  const strategy1 = async () => {
    logger.info('🔄 Strategy 1: Web client with cookies');
    
    // Check formats first
    const check = await checkAvailableFormats(url, cookiesPath, [
      "--extractor-args", "youtube:player_client=web"
    ]);
    
    if (!check.hasFormats) {
      logger.warn('No formats available with web client');
      return false;
    }
    
    return downloadWithArgs(url, outPath, cookiesPath, fileType, taskId, [
      "--extractor-args", "youtube:player_client=web"
    ]);
  };

  // Strategy 2: Web + embedded client
  const strategy2 = async () => {
    logger.info('🔄 Strategy 2: Web embedded client');
    
    const check = await checkAvailableFormats(url, cookiesPath, [
      "--extractor-args", "youtube:player_client=web_embedded"
    ]);
    
    if (!check.hasFormats) {
      logger.warn('No formats available with web_embedded client');
      return false;
    }
    
    return downloadWithArgs(url, outPath, cookiesPath, fileType, taskId, [
      "--extractor-args", "youtube:player_client=web_embedded"
    ]);
  };

  // Strategy 3: TV client (sometimes bypasses restrictions)
  const strategy3 = async () => {
    logger.info('🔄 Strategy 3: TV embedded client');
    
    const check = await checkAvailableFormats(url, cookiesPath, [
      "--extractor-args", "youtube:player_client=tv_embedded"
    ]);
    
    if (!check.hasFormats) {
      logger.warn('No formats available with tv_embedded client');
      return false;
    }
    
    return downloadWithArgs(url, outPath, cookiesPath, fileType, taskId, [
      "--extractor-args", "youtube:player_client=tv_embedded"
    ]);
  };

  // Strategy 4: MediaConnect client (new, for restricted content)
  const strategy4 = async () => {
    logger.info('🔄 Strategy 4: MediaConnect client');
    
    const check = await checkAvailableFormats(url, cookiesPath, [
      "--extractor-args", "youtube:player_client=mediaconnect"
    ]);
    
    if (!check.hasFormats) {
      logger.warn('No formats available with mediaconnect client');
      return false;
    }
    
    return downloadWithArgs(url, outPath, cookiesPath, fileType, taskId, [
      "--extractor-args", "youtube:player_client=mediaconnect"
    ]);
  };

  // Strategy 5: No cookies (public videos only)
  const strategy5 = async () => {
    logger.info('🔄 Strategy 5: No cookies, default client');
    
    // Try without cookies
    const check = await checkAvailableFormats(url, '/dev/null', []);
    
    if (!check.hasFormats) {
      logger.warn('No formats available without cookies');
      return false;
    }
    
    return downloadWithArgs(url, outPath, '/dev/null', fileType, taskId, []);
  };

  // Strategy 6: OAuth flow (most reliable for restricted content)
  const strategy6 = async () => {
    logger.info('🔄 Strategy 6: OAuth authentication');
    
    const check = await checkAvailableFormats(url, cookiesPath, [
      "--extractor-args", "youtube:player_client=web",
      "--username", "oauth2",
      "--password", ""
    ]);
    
    if (!check.hasFormats) {
      logger.warn('No formats available with OAuth');
      return false;
    }
    
    return downloadWithArgs(url, outPath, cookiesPath, fileType, taskId, [
      "--extractor-args", "youtube:player_client=web",
      "--username", "oauth2",
      "--password", ""
    ]);
  };

  // Try strategies in order
  const strategies = [
    strategy1,  // Web client (best with cookies)
    strategy2,  // Web embedded
    strategy3,  // TV embedded
    strategy4,  // MediaConnect
    strategy5,  // No cookies
    strategy6,  // OAuth (last resort)
  ];
  
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    
    try {
      logger.info(`Attempting strategy ${i + 1}/${strategies.length}`);
      const success = await strategy();
      
      if (success && existsSync(outPath)) {
        const stats = fs.statSync(outPath);
        if (stats.size > 1000) {
          logger.info(`✅ Success with strategy ${i + 1}!`);
          return true;
        }
      }
      
      logger.warn(`❌ Strategy ${i + 1} failed, trying next...`);
    } catch (err) {
      logger.error(`Strategy ${i + 1} error:`, err);
    }
    
    // Wait before retry
    if (i < strategies.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return false;
}

// Main download function
export async function downloadTask(
  taskId: string,
  url: string,
  fileType: 'video' | 'audio' = 'video'
) {
  try {
    ensureTempDir();
    tasks.update(taskId, { 
      status: 'processing', 
      message: 'Starting download', 
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
        logger.info('✅ Cookies file written');
      } else {
        logger.warn('⚠️ No cookies provided, may fail for restricted videos');
      }

      // Try download with multiple strategies
      tasks.update(taskId, { message: 'Checking video availability...' });
      
      const success = await tryDownloadStrategies(
        url, 
        outPath, 
        cookiesPath, 
        fileType,
        taskId
      );

      if (!success) {
        // One last check if file somehow exists
        if (!existsSync(outPath)) {
          throw new Error(
            'Video không thể download. Có thể:\n' +
            '• Video bị private/unlisted\n' +
            '• Video bị age-restricted (cần cookies hợp lệ)\n' +
            '• Video bị geo-blocked\n' +
            '• Cookies đã hết hạn\n' +
            '• Video đang được xử lý bởi YouTube'
          );
        }
      }

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
      
      // Validate file
      if (stat.size < 1000) {
        throw new Error(
          `File too small (${stat.size} bytes) - download may have failed`
        );
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

    // Non-YouTube downloads (existing code)
    const outName = `download-${Date.now()}`;
    const extMatch = url.match(/\.([a-z0-9]{2,5})(?:$|[?#])/i);
    const extHttp = extMatch ? extMatch[1] : (fileType === 'audio' ? 'mp3' : 'mp4');
    const finalName = `${outName}.${extHttp}`;
    const outPath = path.resolve(toPublicPath(finalName));
    const outDir = path.dirname(outPath);

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    await new Promise<void>((resolve, reject) => {
      const stream = got.stream(url);
      const write = fs.createWriteStream(outPath);

      stream.on('downloadProgress', (p: any) => {
        if (p.total) {
          const pct = Math.min(95, Math.floor((p.transferred / p.total) * 100));
          tasks.update(taskId, { progress: pct, message: `downloading ${pct}%` });
        }
      });

      stream.on('error', reject);
      write.on('error', reject);
      write.on('finish', resolve);
      stream.pipe(write);
    });

    const stat = await fs.promises.stat(outPath);
    tasks.complete(taskId, {
      downloadUrl: getPublicUrl(path.basename(outPath)),
      filePath: outPath,
      fileName: path.basename(outPath),
      size: stat.size,
    });

  } catch (err: any) {
    logger.error('downloadTask failed', err);
    tasks.error(taskId, err?.message || 'Download failed');
  }
}