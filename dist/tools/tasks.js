import { createHash } from 'node:crypto';
import { z } from 'zod';
const IDSchema = z.string().min(1).brand('id');
export const TaskIDSchema = IDSchema.brand('task');
export const TaskStatusSchema = z.enum(['not-started', 'in-progress', 'complete']).brand('task-status');
export const DependentTaskSchema = z.object({
    taskID: TaskIDSchema.describe('The identifier of the dependent task.'),
    currentStatus: TaskStatusSchema.describe('The current status of the dependent task.'),
});
export function newTaskID(title) {
    return TaskIDSchema.parse(createHash('md5').update(`task-${title}`).digest('hex'));
}
export const UncertaintyAreaStatus = z.enum(['open', 'resolved']).brand('uncertainty-area-status');
export const UncertaintyAreaSchema = z.object({
    description: z.string().min(1).describe('A description of this uncertainty area.'),
    status: UncertaintyAreaStatus.describe('The research status of this uncertainty area.'),
    resolution: z
        .string()
        .min(1)
        .optional()
        .describe(`A detailed description of the outcome of the research for this uncertainty area.
Must be provided if status is 'resolved'.`),
});
