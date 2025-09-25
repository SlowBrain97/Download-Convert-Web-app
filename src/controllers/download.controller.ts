import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { tasks } from '../utils/taskManager.js';
import { downloadTask } from '../services/download.service.js';

export const startDownload = asyncHandler(async (req: Request, res: Response) => {
  const { url, fileType } = req.body as { url?: string; fileType?: 'video' | 'audio' };
  if (!url) return res.status(400).json({ error: true, message: 'Missing url' });

  const task = tasks.createTask({ message: 'Queued download' });
  setImmediate(() => downloadTask(task.id, url, (fileType as any) || 'video'));

  res.json({ taskId: task.id });
});
