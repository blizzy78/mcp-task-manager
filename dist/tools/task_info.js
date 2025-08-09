import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TaskIDSchema } from './tasks.js';
export const TaskInfoArgsSchema = z.object({
    taskID: TaskIDSchema.describe('The identifier of this task.'),
});
export const TASK_INFO = 'task_info';
export const taskInfoTool = {
    name: TASK_INFO,
    title: 'Get task info',
    description: 'A tool to retrieve full information about a task.',
    inputSchema: zodToJsonSchema(TaskInfoArgsSchema),
};
export async function handleTaskInfo({ taskID }, taskDB) {
    const task = taskDB.get(taskID);
    if (!task) {
        throw new Error(`Invalid task info request: Unknown task ID: ${taskID}`);
    }
    const res = {
        task: {
            ...task,
            // we don't want them to see this
            uncertaintyAreasUpdated: undefined,
        },
    };
    return {
        content: [
            {
                type: 'text',
                audience: ['assistant'],
                text: JSON.stringify(res),
            },
        ],
        structuredContent: res,
    };
}
