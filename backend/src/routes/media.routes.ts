import { Router } from 'express';
import { upload } from '../middlewares/upload.js';
import { convertMedia } from '../controllers/media.controller.js';
import { validate } from '../middlewares/validate.js';
import { mediaConvertSchema } from '../schemas/media.schema.js';

const router = Router();

router.post(
  '/convert',
  upload.single('file'),
  validate({ body: mediaConvertSchema }, { requireFile: true, fileFieldName: 'file' }),
  convertMedia
);

export default router;
