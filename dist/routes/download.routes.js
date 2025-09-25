import { Router } from 'express';
import { startDownload } from '../controllers/download.controller.js';
import { validate } from '../middlewares/validate.js';
import { downloadSchema } from '../schemas/download.schema.js';
const router = Router();
router.post('/', validate({ body: downloadSchema }), startDownload);
export default router;
