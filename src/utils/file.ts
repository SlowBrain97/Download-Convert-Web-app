import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');
const fallbackTemp = path.join(rootDir, 'tmp');
const publicDirPath = path.join(rootDir, 'public');

export function tempDir() {
  return env('TEMP_DIR', fallbackTemp);
}

export function ensureTempDir() {
  const dir = tempDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(publicDirPath)) fs.mkdirSync(publicDirPath, { recursive: true });
}

export function publicDir() {
  return publicDirPath;
}

export function toPublicPath(filename: string) {
  return path.join(publicDirPath, filename);
}

export function getPublicUrl(filename: string) {
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
  if (!base) return `/public/${filename}`;
  return `${base}/public/${filename}`;
}

export async function removeFileSafe(p: string): Promise<void> {
  try {
    await fs.promises.unlink(p);
  } catch (e: any) {
    if (e?.code !== 'ENOENT') logger.warn(`removeFileSafe failed for ${p}`, e);
  }
}

export async function streamToFile(readable: NodeJS.ReadableStream, destPath: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  const writable = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    readable.pipe(writable);
    writable.on('finish', resolve);
    writable.on('error', reject);
    readable.on('error', reject);
  });
}
