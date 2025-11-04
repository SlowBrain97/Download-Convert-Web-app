import multer from 'multer';
import path from 'node:path';
import { ensureTempDir, tempDir } from '../utils/file.js';
import type { Request } from 'express';

ensureTempDir();

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: any, destination: string) => void) => {
    cb(null, tempDir());
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: any, filename: string) => void) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

export const upload = multer({ storage, limits: { fileSize: 300 * 1024 * 1024 } }); 
