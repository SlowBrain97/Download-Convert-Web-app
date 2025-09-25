import multer from 'multer';
import path from 'node:path';
import { ensureTempDir, tempDir } from '../utils/file.js';
ensureTempDir();
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, tempDir());
    },
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${unique}${ext}`);
    },
});
export const upload = multer({ storage, limits: { fileSize: 300 * 1024 * 1024 } });
