import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { tasks } from '../utils/taskManager.js';
import { convertDocTask } from '../services/docs.service.js';

export const convertDoc = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  const { inputFormat, outputFormat } = req.body as { inputFormat?: string; outputFormat?: string };

  if (!file) return res.status(400).json({ error: true, message: 'Missing file' });
  if (!inputFormat || !outputFormat) return res.status(400).json({ error: true, message: 'Missing inputFormat or outputFormat' });

  const task = tasks.createTask({ message: 'Queued document conversion' });
  setImmediate(() => convertDocTask(task.id, file.path, String(inputFormat), String(outputFormat)));

  res.json({ taskId: task.id });
});
