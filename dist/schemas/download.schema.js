import { z } from 'zod';
export const downloadSchema = z.object({
    url: z.string().url(),
    fileType: z.enum(['video', 'audio']).optional(),
});
