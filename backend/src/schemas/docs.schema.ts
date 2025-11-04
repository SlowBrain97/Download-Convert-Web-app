import { z } from 'zod';

export const docsConvertSchema = z.object({
  inputFormat: z.string().min(1),
  outputFormat: z.string().min(1),
});
