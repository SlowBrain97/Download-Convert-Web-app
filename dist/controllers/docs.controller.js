import { asyncHandler } from '../middlewares/asyncHandler.js';
import { tasks } from '../utils/taskManager.js';
import { convertDocTask } from '../services/docs.service.js';
export const convertDoc = asyncHandler(async (req, res) => {
    const file = req.file;
    const { inputFormat, outputFormat } = req.body;
    if (!file)
        return res.status(400).json({ error: true, message: 'Missing file' });
    if (!inputFormat || !outputFormat)
        return res.status(400).json({ error: true, message: 'Missing inputFormat or outputFormat' });
    const task = tasks.createTask({ message: 'Queued document conversion' });
    setImmediate(() => convertDocTask(task.id, file.path, String(inputFormat), String(outputFormat)));
    res.json({ taskId: task.id });
});
