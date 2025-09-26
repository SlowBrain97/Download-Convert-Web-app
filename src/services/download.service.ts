import path from 'node:path';
import fs from 'node:fs';
import ytdl from "ytdl-core";
import got from 'got';
import { tasks } from '../utils/taskManager.js';
import { getPublicUrl, toPublicPath } from '../utils/file.js';
import { logger } from '../utils/logger.js';

function isYouTube(url: string) {
  return /(?:youtube\.com|youtu\.be)\//i.test(url);
}

export async function downloadTask(taskId: string, url: string, fileType: 'video' | 'audio' = 'video') {
  try {
    tasks.update(taskId, { status: 'processing', message: 'Starting download', progress: 5 });

    if (isYouTube(url)) {
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title.replace(/[^a-z0-9_\-\.]/gi, '_');
      const ext = fileType === 'audio' ? 'mp3' : 'mp4';
      const outName = `${title}.${ext}`;
      const outPath = toPublicPath(outName);

      const format = ytdl.chooseFormat(info.formats, {
        quality: fileType === 'audio' ? 'highestaudio' : 'highestvideo',
        filter: fileType === 'audio' ? 'audioonly' : 'videoandaudio',
      });

      await new Promise<void>((resolve, reject) => {
        const total = Number(format.contentLength || 0);
        let downloaded = 0;
        const read = ytdl.downloadFromInfo(info, { format });
        const write = fs.createWriteStream(outPath);

        read.on('progress', (_chunkLen, downloadedBytes, totalBytes) => {
          downloaded = downloadedBytes;
          const t = total || totalBytes || 0;
          if (t > 0) {
            const pct = Math.min(95, Math.max(10, Math.floor((downloaded / t) * 100)));
            tasks.update(taskId, { progress: pct, message: `downloading ${pct}%` });
          }
        });
        read.on('error', reject);
        write.on('error', reject);
        write.on('finish', resolve);
        read.pipe(write);
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

    // Fallback: direct HTTP GET download if URL is a direct media file
    const outName = `download-${Date.now()}`;
    const extMatch = url.match(/\.([a-z0-9]{2,5})(?:$|[?#])/i);
    const ext = extMatch ? extMatch[1] : (fileType === 'audio' ? 'mp3' : 'mp4');
    const finalName = `${outName}.${ext}`;
    const outPath = toPublicPath(finalName);

    await new Promise<void>((resolve, reject) => {
      const stream = got.stream(url);
      const write = fs.createWriteStream(outPath);
      stream.on('downloadProgress', (p: any) => {
        if (p.total) {
          const pct = Math.min(95, Math.max(10, Math.floor((p.transferred / p.total) * 100)));
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


