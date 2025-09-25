import { ZodError } from 'zod';
export function validate(schemas, options = {}) {
    const { requireFile = false, fileFieldName = 'file' } = options;
    return (req, res, next) => {
        try {
            if (schemas.body) {
                const parsed = schemas.body.parse(req.body);
                req.validatedBody = parsed;
            }
            if (schemas.query) {
                const parsed = schemas.query.parse(req.query);
                req.validatedQuery = parsed;
            }
            if (schemas.params) {
                const parsed = schemas.params.parse(req.params);
                req.validatedParams = parsed;
            }
            if (requireFile) {
                const file = req.file;
                if (!file) {
                    return res.status(400).json({ error: true, message: `Missing ${fileFieldName} file` });
                }
            }
            return next();
        }
        catch (err) {
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
