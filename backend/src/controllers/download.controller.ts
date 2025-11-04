import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { tasks } from '../utils/taskManager.js';
import  youtubeDownloadTask  from '../services/youtubeDownload.service.js';
import  instagramDownloadTask  from '../services/instaDownload.service.js';

export const startDownload = asyncHandler(async (req: Request, res: Response) => {
  const { url, fileType, platform } = req.body as { url?: string; fileType?: 'video' | 'audio'; platform?: 'youtube' | 'instagram' };
  if (!url) return res.status(400).json({ error: true, message: 'Missing url' });

  const task = tasks.createTask({ message: 'Queued download' });
  if (platform === 'instagram') {
    setImmediate(() => instagramDownloadTask(task.id, url, (fileType as 'video' || 'audio')|| 'video'));
  } else {
    setImmediate(() => youtubeDownloadTask(task.id, url, (fileType as 'video' || 'audio') || 'video'));
  }

  res.json({ taskId: task.id });
});
