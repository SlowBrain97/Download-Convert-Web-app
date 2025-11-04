import { Router } from 'express';
import mediaRoutes from './media.routes.js';
import downloadRoutes from './download.routes.js';
import docsRoutes from './docs.routes.js';
import { progressRouter } from './progress.routes.js';

const router = Router();

router.use('/media', mediaRoutes);
router.use('/download', downloadRoutes);
router.use('/docs', docsRoutes);
router.use('/progress', progressRouter);

export default router;
