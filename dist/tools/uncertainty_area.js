import { z } from 'zod';
export const UncertaintyAreaSchema = z.object({
    title: z.string().min(1).describe('A concise title for this uncertainty area.'),
    description: z.string().min(1).describe('A description of this uncertainty area.'),
});
