import { z } from 'zod';

export const downloadSchema = z.object({
  url: z.string().url(),
  fileType: z.enum(['video', 'audio']).optional(),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'x']).optional(),
});
