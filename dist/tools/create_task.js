import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { newTaskID, TaskIDSchema, TaskStatusSchema, UncertaintyAreaSchema } from './tasks.js';
export const CreateTaskArgsSchema = z.object({
    title: z.string().min(1).describe('A concise title for this task.'),
    description: z.string().min(1).describe('A detailed description of this task.'),
    goal: z.string().min(1).describe('The overall goal of this task.'),
    parentTaskID: TaskIDSchema.optional().describe(`The identifier of the parent task this task belongs to, if applicable.
Must be provided if this task is a subtask of another task.`),
    dependentTaskIDs: TaskIDSchema.array()
        .min(1)
        .optional()
        .describe(`A list of task identifiers this task depends on, if applicable.
Must be provided if this task can't be started before all of the dependent tasks are complete.`),
    uncertaintyAreas: UncertaintyAreaSchema.array().describe('A detailed list of areas where there is uncertainty about the task requirements or execution.'),
});
export const CREATE_TASK = 'create_task';
export const createTaskTool = {
    name: CREATE_TASK,
    title: 'Create task',
    description: `A tool to create a new task that must be completed.
Tasks can optionally be part of a parent task, forming a tree-like structure.
Can optionally provide a list of dependent tasks that must be completed first.
Should provide a list of uncertainty areas to clarify before starting the task.
All tasks start in the 'not-started' status. Use the 'transition_task_status'
tool to transition the status of a task.`,
    inputSchema: zodToJsonSchema(CreateTaskArgsSchema),
};
export async function handleCreateTask({ title, description, parentTaskID, dependentTaskIDs, uncertaintyAreas, }) {
    const taskID = newTaskID(`${title}: ${description}`);
    const res = {
        taskID,
        parentTaskID,
        dependentTaskIDs,
        currentStatus: TaskStatusSchema.parse('not-started'),
    };
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
                text: `Created task with ID: ${taskID}.${uncertaintyAreas.find((area) => area.status !== 'resolved')
                    ? ' Recommend using all available tools as appropriate to resolve all remaining ' +
                        'uncertainty areas before proceeding with this task. ' +
                        `Must use 'update_task' tool to update uncertainty areas once resolved.`
                    : ''}`,
            },
        ],
        structuredContent: res,
    };
}
