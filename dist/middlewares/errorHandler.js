import { logger } from '../utils/logger.js';
// Centralized error handler
export function errorHandler(err, _req, res, _next) {
    const status = err.status || err.code || 500;
    const message = err.message || 'Internal Server Error';
    const details = err.details;
    if (status >= 500) {
        logger.error(`[${status}] ${message}`, { err });
    }
    else {
        logger.warn(`[${status}] ${message}`);
    }
    res.status(Number.isInteger(status) ? status : 500).json({
        error: true,
        message,
        details,
    });
}
