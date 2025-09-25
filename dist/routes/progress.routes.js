import { Router } from 'express';
import { tasks } from '../utils/taskManager.js';
import { initSSE, keepAlive, sendSSE } from '../utils/sse.js';
export const progressRouter = Router();
progressRouter.get('/:taskId', (req, res) => {
    const { taskId } = req.params;
    console.log("sse running", taskId);
    const task = tasks.getTask(taskId);
    if (!task) {
        return res.status(404).json({ error: true, message: 'Task not found' });
    }
    initSSE(res);
    const stop = keepAlive(res);
    // Send initial state
    sendSSE(res, 'progress', task);
    const onProgress = (info) => sendSSE(res, 'progress', info);
    const onComplete = (info) => {
        sendSSE(res, 'complete', info);
        stop();
        res.end();
    };
    const onError = (info) => {
        sendSSE(res, 'error', info);
        stop();
        res.end();
    };
    tasks.on(taskId, 'progress', onProgress);
    tasks.on(taskId, 'complete', onComplete);
    tasks.on(taskId, 'error', onError);
    req.on('close', () => {
        tasks.off(taskId, 'progress', onProgress);
        tasks.off(taskId, 'complete', onComplete);
        tasks.off(taskId, 'error', onError);
        stop();
    });
});
