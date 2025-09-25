import path from 'node:path';
import fs from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { tasks } from '../utils/taskManager.js';
import { getPublicUrl, toPublicPath } from '../utils/file.js';
import { logger } from '../utils/logger.js';
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}
export async function convertMediaTask(taskId, inputPath, outputFormat) {
    try {
        tasks.update(taskId, { status: 'processing', message: 'Starting media conversion', progress: 5 });
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const outFileName = `${baseName}.${outputFormat}`;
        const outPath = toPublicPath(outFileName);
        await new Promise((resolve, reject) => {
            let lastPercent = 0;
            ffmpeg(inputPath)
                .on('start', () => {
                tasks.update(taskId, { message: 'ffmpeg started', progress: 10 });
            })
                .on('progress', (p) => {
                console.log(p);
                const pct = Math.min(95, Math.max(10, Math.round(p.percent || 0) * 100));
                if (Math.abs(pct - lastPercent) >= 5) {
                    lastPercent = pct;
                    tasks.update(taskId, { progress: pct, message: `processing ${pct}%` });
                }
            })
                .on('error', (err) => {
                reject(err);
            })
                .on('end', () => resolve())
                .output(outPath)
                .toFormat(outputFormat)
                .run();
        });
        const stat = await fs.promises.stat(outPath);
        const result = {
            downloadUrl: getPublicUrl(path.basename(outPath)),
            filePath: outPath,
            fileName: path.basename(outPath),
            size: stat.size,
        };
        tasks.complete(taskId, result);
    }
    catch (err) {
        logger.error('convertMediaTask failed', err);
        tasks.error(taskId, err?.message || 'Conversion failed');
    }
    finally {
        // clean input temp
        try {
            await fs.promises.unlink(inputPath);
        }
        catch { }
    }
}
