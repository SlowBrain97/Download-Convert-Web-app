import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny, z } from 'zod';

export type ValidationSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

export type ValidateOptions = {
  requireFile?: boolean; // for multipart/form-data endpoints
  fileFieldName?: string; // default 'file'
};

export function validate(schemas: ValidationSchemas, options: ValidateOptions = {}) {
  const { requireFile = false, fileFieldName = 'file' } = options;
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        const parsed = schemas.body.parse(req.body);
        (req as any).validatedBody = parsed;
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        (req as any).validatedQuery = parsed;
      }
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params);
        (req as any).validatedParams = parsed;
      }

      if (requireFile) {
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) {
          return res.status(400).json({ error: true, message: `Missing ${fileFieldName} file` });
        }
      }

      return next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: true,
          message: 'Validation failed',
          details: err.flatten(),
        });
      }
      return next(err);
    }
  };
}
