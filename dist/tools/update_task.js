import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DependentTaskSchema, TaskIDSchema, UncertaintyAreaSchema } from './tasks.js';
export const UpdateTaskArgsSchema = z.object({
    taskID: TaskIDSchema.describe('The identifier of this task.'),
    dependsOnTasks: DependentTaskSchema.array()
        .min(1)
        .optional()
        .describe("A list of tasks this task depends on. Must be provided if this task can't be started before the dependent tasks are complete."),
    uncertaintyAreas: UncertaintyAreaSchema.array().describe('A detailed list of areas where there is uncertainty about the task requirements or execution.'),
});
export const UPDATE_TASK = 'update_task';
export const updateTaskTool = {
    name: UPDATE_TASK,
    title: 'Update task',
    description: `A tool to update an existing task.
Can be used to add dependent tasks that must be completed first.
Can be used to update the list of remaining uncertainty areas for a task.
A task may only transition to 'in-progress' once all required information has been acquired.`,
    inputSchema: zodToJsonSchema(UpdateTaskArgsSchema),
};
export async function handleUpdateTask({ taskID, uncertaintyAreas }) {
    const res = {};
    return {
        content: [
            {
                type: 'text',
                audience: ['assistant'],
                text: JSON.stringify(res),
            },
            {
                type: 'text',
                audience: ['assistant'],
                text: `Updated task with ID: ${taskID}.${uncertaintyAreas.find((area) => area.status !== 'resolved')
                    ? ' Recommend using all available tools as appropriate to resolve all remaining ' +
                        'uncertainty areas before proceeding with this task. ' +
                        `Must use 'update_task' tool to update uncertainty areas once resolved.`
                    : ''}`,
            },
        ],
        structuredContent: res,
    };
}
