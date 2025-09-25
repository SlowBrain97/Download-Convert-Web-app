import { asyncHandler } from '../middlewares/asyncHandler.js';
import { tasks } from '../utils/taskManager.js';
import { downloadTask } from '../services/download.service.js';
export const startDownload = asyncHandler(async (req, res) => {
    const { url, fileType } = req.body;
    if (!url)
        return res.status(400).json({ error: true, message: 'Missing url' });
    const task = tasks.createTask({ message: 'Queued download' });
    setImmediate(() => downloadTask(task.id, url, fileType || 'video'));
    res.json({ taskId: task.id });
});
