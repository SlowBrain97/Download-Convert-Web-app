import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger.js';
import { publicDir, tempDir } from './file.js';

function removeOlderThan(dir: string, maxAgeMs: number) {
  fs.promises.readdir(dir).then(async (files) => {
    const now = Date.now();
    for (const f of files) {
      const full = path.join(dir, f);
      try {
        const st = await fs.promises.stat(full);
        if (st.isFile()) {
          const age = now - st.mtimeMs;
          if (age > maxAgeMs) {
            await fs.promises.unlink(full);
            logger.info(`Cleaned file: ${full}`);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }).catch(() => {/* ignore */});
}

export function initCleanupScheduler() {
  const temp = tempDir();
  const pub = publicDir();
  const MAX_AGE_MS = Number(process.env.FILE_MAX_AGE_MS || 1000 * 60 * 5); 
  const INTERVAL_MS = Number(process.env.CLEANUP_INTERVAL_MS || 1000 * 60 * 6); 

  // immediate cleanup on boot (non-blocking)
  setTimeout(() => {
    removeOlderThan(temp, MAX_AGE_MS);
    removeOlderThan(pub, MAX_AGE_MS);
  }, 5000);

  // schedule periodic cleanup
  setInterval(() => {
    removeOlderThan(temp, MAX_AGE_MS);
    removeOlderThan(pub, MAX_AGE_MS);
  }, INTERVAL_MS);
}
