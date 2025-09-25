import { z } from 'zod';

export const mediaConvertSchema = z.object({
  inputFormat: z.string().min(1).optional(),
  outputFormat: z.string().min(1),
});
