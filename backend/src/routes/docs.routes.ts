import { Router } from 'express';
import { upload } from '../middlewares/upload.js';
import { convertDoc } from '../controllers/docs.controller.js';
import { validate } from '../middlewares/validate.js';
import { docsConvertSchema } from '../schemas/docs.schema.js';

const router = Router();

router.post(
  '/convert',
  upload.single('file'),
  validate({ body: docsConvertSchema }, { requireFile: true, fileFieldName: 'file' }),
  convertDoc
);

export default router;
