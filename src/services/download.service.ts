import path from 'node:path';
import fs from 'node:fs';
import got from 'got';
import { tasks } from '../utils/taskManager.js';
import { getPublicUrl, toPublicPath, ensureTempDir } from '../utils/file.js';
import { logger } from '../utils/logger.js';
import { existsSync } from 'fs';
import { spawn } from 'node:child_process';
import { ffmpegPath } from './media.service.js';


function isYouTube(url: string) {
  return /(?:youtube\.com|youtu\.be)\//i.test(url);
}

export async function downloadTask(
  taskId: string,
  url: string,
  fileType: 'video' | 'audio' = 'video'
) {
  try {

    ensureTempDir();

    tasks.update(taskId, { status: 'processing', message: 'Starting download', progress: 0});


    if (isYouTube(url)) {
      const titleSafe = `download-${Date.now()}`;
      const ext = fileType === 'audio' ? 'mp3' : 'mp4';
      const outName = `${titleSafe}.${ext}`;

      const outPath = path.resolve(toPublicPath(outName));
      const outDir = path.dirname(outPath);


      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      console.log(`📁 Output directory: ${outDir}`);
      console.log(`📄 Output path: ${outPath}`);


      const subprocess = spawn("/usr/local/bin/yt-dlp", [
        url,
        "--output",
        outPath,
        "--format",
        fileType === "audio"
          ? "bestaudio"
          : "bestvideo+bestaudio[ext=m4a]/best",
        "--merge-output-format",
        "mp4",
        "--ffmpeg-location",
        ffmpegPath as any
      ]); 
      subprocess.stdout?.on('data', (chunk: Buffer) => {
        const line = chunk.toString();
        const match = line.match(/(\d{1,3}\.\d)%/);
        if (match) {
          const pct = Math.min(95, Math.max(0, Math.floor(parseFloat(match[1]))));
          tasks.update(taskId, { progress: pct, message: `downloading ${pct}%` });
          console.log(`⏳ Progress: ${pct}%`);
        }
      });

      subprocess.stderr?.on('data', (chunk: Buffer) => {
        console.log(`[yt-dlp stderr]: ${chunk.toString()}`);
      });

      await new Promise<void>((resolve, reject) => {
        subprocess.on('error', reject);
        subprocess.on('close', async (code) => {
          console.log(`[yt-dlp] Process closed with code: ${code}`);
          
          if (code === 0) {
           
            const maxRetries = 10;
            let retries = 0;

            while (retries < maxRetries && !existsSync(outPath)) {
              await new Promise(r => setTimeout(r, 300));
              retries++;
              console.log(`⏳ Waiting for file... (${retries}/${maxRetries})`);
            }

            if (!existsSync(outPath)) {
              return reject(
                new Error(`ENOENT: File not found after waiting: ${outPath}`)
              );
            }

            const stats = fs.statSync(outPath);
            console.log(`📊 File stats:`);
            console.log(`   - Path: ${outPath}`);
            console.log(`   - Size: ${stats.size} bytes`);
            console.log(`   - Modified: ${new Date(stats.mtime).toISOString()}`);
       
            const buffer = Buffer.alloc(12);
            const fd = fs.openSync(outPath, 'r');
            fs.readSync(fd, buffer, 0, 12, 0);
            fs.closeSync(fd);
            
            const hexSignature = buffer.toString('hex').substring(0, 16);
            const isValidMp4 = hexSignature.includes('6674797066747970'); 
            
            console.log(`🔍 File signature (hex): ${hexSignature}`);
            console.log(`✅ Valid MP4?: ${isValidMp4 ? 'YES' : 'NO - Might be corrupted'}`);

            if (stats.size < 1000) {
              console.warn(`⚠️  File very small (${stats.size} bytes) - might be incomplete`);
            }

            resolve();
          } else {
            reject(new Error(`Download failed with code ${code}`));
          }
        });
      });

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
          const pct = Math.min(95, Math.max(0, Math.floor((p.transferred / p.total) * 100)));
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