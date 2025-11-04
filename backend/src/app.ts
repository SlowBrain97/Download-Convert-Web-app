import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';
import { initCleanupScheduler } from './utils/cleanup.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_BASE_URL || "http://localhost:3000" 
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/public', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment;`);
  next();
},express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});
app.get('/ping', (_req:Request, res:Response) => {
  res.json({ message: 'pong', env: process.env.NODE_ENV || 'dev' });
});
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

initCleanupScheduler();

export default app;
