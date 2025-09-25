import { asyncHandler } from '../middlewares/asyncHandler.js';
import { tasks } from '../utils/taskManager.js';
import { convertMediaTask } from '../services/media.service.js';
export const convertMedia = asyncHandler(async (req, res, _next) => {
    const file = req.file;
    const { outputFormat } = req.body;
    if (!file) {
        return res.status(400).json({ error: true, message: 'Missing file' });
    }
    if (!outputFormat) {
        return res.status(400).json({ error: true, message: 'Missing outputFormat' });
    }
    const task = tasks.createTask({ message: 'Queued media conversion' });
    // fire and forget
    setImmediate(() => convertMediaTask(task.id, file.path, String(outputFormat).toLowerCase()));
    res.json({ taskId: task.id });
});
