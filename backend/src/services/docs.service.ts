import path from 'node:path';
import fs from 'node:fs';
import { tasks } from '../utils/taskManager.js';
import { getPublicUrl, toPublicPath } from '../utils/file.js';
import { logger } from '../utils/logger.js';
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import libreofficeConvert from 'libreoffice-convert';

async function tryLibreOfficeConvert(buffer: Buffer, extOut: string): Promise<Buffer> {
  try {
    // dynamic import optional dependency
    
    return await new Promise<Buffer>((resolve, reject) => {
      libreofficeConvert.convert(buffer, `.${extOut}`, undefined, (err: any, done: Buffer) => {
        if (err) reject(err);
        else resolve(done);
      });
    });
  } catch (e) {
    throw Object.assign(new Error('LibreOffice is not available in this environment'), { status: 501 });
  }
}

export async function convertDocTask(taskId: string, inputPath: string, inputFormat: string, outputFormat: string) {
  try {
    tasks.update(taskId, { status: 'processing', progress: 5, message: 'Starting document conversion' });

    const inFmt = inputFormat.toLowerCase();
    const outFmt = outputFormat.toLowerCase();

    // Simple paths without LibreOffice
    if (inFmt === 'docx' && outFmt === 'html') {
      const buffer = await fs.promises.readFile(inputPath);
      const result = await mammoth.convertToHtml({ buffer });
      const outName = `${path.basename(inputPath, path.extname(inputPath))}-${Date.now()}.html`;
      const outPath = toPublicPath(outName);
      await fs.promises.writeFile(outPath, result.value, 'utf8');
      const stat = await fs.promises.stat(outPath);
      tasks.complete(taskId, {
        downloadUrl: getPublicUrl(path.basename(outPath)),
        filePath: outPath,
        fileName: path.basename(outPath),
        size: stat.size,
      });
      return;
    }

    if (inFmt === 'xlsx' && outFmt === 'csv') {
      const wb = XLSX.readFile(inputPath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      const outName = `${path.basename(inputPath, path.extname(inputPath))}-${Date.now()}.csv`;
      const outPath = toPublicPath(outName);
      await fs.promises.writeFile(outPath, csv, 'utf8');
      const stat = await fs.promises.stat(outPath);
      tasks.complete(taskId, {
        downloadUrl: getPublicUrl(path.basename(outPath)),
        filePath: outPath,
        fileName: path.basename(outPath),
        size: stat.size,
      });
      return;
    }

    // General conversion via LibreOffice if available
    const buffer = await fs.promises.readFile(inputPath);
    const converted = await tryLibreOfficeConvert(buffer, outFmt);
    const outName = `${path.basename(inputPath, path.extname(inputPath))}-${Date.now()}.${outFmt}`;
    const outPath = toPublicPath(outName);
    await fs.promises.writeFile(outPath, converted);
    const stat = await fs.promises.stat(outPath);
    tasks.complete(taskId, {
      downloadUrl: getPublicUrl(path.basename(outPath)),
      filePath: outPath,
      fileName: path.basename(outPath),
      size: stat.size,
    });
  } catch (err: any) {
    logger.error('convertDocTask failed', err);
    tasks.error(taskId, err?.message || 'Document conversion failed');
  } finally {
    try { await fs.promises.unlink(inputPath); } catch {}
  }
}
