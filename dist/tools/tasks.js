import { z } from 'zod';
const IDSchema = z.string().min(1).brand('id');
export const TaskIDSchema = IDSchema.brand('task');
export const TaskStatusSchema = z.enum(['not-started', 'in-progress', 'complete']).brand('task-status');
