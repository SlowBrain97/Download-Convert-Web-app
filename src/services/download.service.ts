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



async function checkAvailableFormats(url: string, cookiesPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const subprocess = spawn("/usr/local/bin/yt-dlp", [
      url,
      "--list-formats",
      "--cookies", cookiesPath,
      "--extractor-args", "youtube:player_client=android,ios",
    ]);

    let output = '';
    subprocess.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    subprocess.on("close", (code) => {
      // Kiểm tra xem có format thực tế không (không phải chỉ storyboard)
      const hasRealFormats = output.includes('mp4') || 
                            output.includes('webm') || 
                            output.includes('m4a');
      
      logger.info(`Format check: ${hasRealFormats ? 'Has real formats' : 'Only storyboards'}`);
      resolve(hasRealFormats);
    });
  });
}

// Thử download với nhiều strategies
async function tryDownloadWithStrategy(
  url: string, 
  outPath: string, 
  cookiesPath: string,
  fileType: 'video' | 'audio',
  taskId: string
): Promise<boolean> {
  
  // Strategy 1: Android + iOS client
  const strategy1 = async () => {
    logger.info('🔄 Strategy 1: Android + iOS clients');
    return downloadWithArgs(url, outPath, cookiesPath, fileType, taskId, [
      "--extractor-args", "youtube:player_client=android,ios",
      "--user-agent", "com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip",
    ]);
  };

  // Strategy 2: Web client with cookies
  const strategy2 = async () => {
    logger.info('🔄 Strategy 2: Web client');
    return downloadWithArgs(url, outPath, cookiesPath, fileType, taskId, [
      "--extractor-args", "youtube:player_client=web",
    ]);
  };

  // Strategy 3: TV client (sometimes bypasses restrictions)
  const strategy3 = async () => {
    logger.info('🔄 Strategy 3: TV client');
    return downloadWithArgs(url, outPath, cookiesPath, fileType, taskId, [
      "--extractor-args", "youtube:player_client=tv_embedded",
    ]);
  };

  // Strategy 4: No client specification (default)
  const strategy4 = async () => {
    logger.info('🔄 Strategy 4: Default client');
    return downloadWithArgs(url, outPath, cookiesPath, fileType, taskId, []);
  };

  // Thử từng strategy
  const strategies = [strategy1, strategy2, strategy3, strategy4];
  
  for (const strategy of strategies) {
    const success = await strategy();
    if (success) {
      logger.info('✅ Download successful with this strategy');
      return true;
    }
    logger.warn('❌ Strategy failed, trying next...');
    await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
  }

  return false;
}

// Helper function để download với args cụ thể
function downloadWithArgs(
  url: string,
  outPath: string, 
  cookiesPath: string,
  fileType: 'video' | 'audio',
  taskId: string,
  extraArgs: string[]
): Promise<boolean> {
  return new Promise((resolve) => {
    const baseArgs = [
      url,
      "--no-warnings",
      "--cookies", cookiesPath,
      ...extraArgs,
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
        "--format", "bv*+ba/b",  // best video + audio, fallback to best
        "--merge-output-format", "mp4"
      );
    }

    const subprocess = spawn("/usr/local/bin/yt-dlp", args);
    
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
      resolve(code === 0);
    });
  });
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
      }

      // Kiểm tra formats trước
      tasks.update(taskId, { message: 'Checking video availability...' });
      const hasFormats = await checkAvailableFormats(url, cookiesPath);
      
      if (!hasFormats) {
        throw new Error(
          'Video không khả dụng. Có thể video bị private, age-restricted, ' +
          'geo-blocked, hoặc cookies không có quyền truy cập.'
        );
      }

      // Thử download với nhiều strategies
      tasks.update(taskId, { message: 'Downloading...' });
      const success = await tryDownloadWithStrategy(
        url, 
        outPath, 
        cookiesPath, 
        fileType,
        taskId
      );

      if (!success) {
        throw new Error('Download failed after trying all strategies');
      }

      // Đợi file xuất hiện
      const maxRetries = 10;
      let retries = 0;
      while (retries < maxRetries && !existsSync(outPath)) {
        await new Promise(r => setTimeout(r, 300));
        retries++;
      }

      if (!existsSync(outPath)) {
        throw new Error(`File not found after waiting: ${outPath}`);
      }

      const stat = await fs.promises.stat(outPath);
      
      // Kiểm tra file size hợp lệ
      if (stat.size < 1000) {
        throw new Error(`File too small (${stat.size} bytes) - might be corrupted`);
      }

      tasks.complete(taskId, {
        downloadUrl: getPublicUrl(path.basename(outPath)),
        filePath: outPath,
        fileName: path.basename(outPath),
        size: stat.size,
      });
      
      logger.info(`✅ Download completed: ${path.basename(outPath)} (${stat.size} bytes)`);
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
