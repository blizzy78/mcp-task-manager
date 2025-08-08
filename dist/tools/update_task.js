import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TaskIDSchema } from './tasks.js';
import { createUncertaintyAreaTasks, UncertaintyAreaSchema } from './uncertainty_area.js';
export const UpdateTaskArgsSchema = z.object({
    taskID: TaskIDSchema.describe('The identifier of this task.'),
    newDependsOnTaskIDs: TaskIDSchema.array().describe('A list of additional task identifiers this task depends on.'),
    newUncertaintyAreas: UncertaintyAreaSchema.array().describe("A detailed list of additional areas where there is uncertainty about this task's requirements or execution."),
    newDefinitionsOfDone: z
        .string()
        .min(1)
        .array()
        .min(1)
        .optional()
        .describe('A detailed list of additional criteria that must be met for this task to be considered complete.'),
});
export const UPDATE_TASK = 'update_task';
export const updateTaskTool = {
    name: UPDATE_TASK,
    title: 'Update task',
    description: `A tool to update an existing task.
Can optionally provide a list of additional dependencies, uncertainty areas, and definitions of done.`,
    inputSchema: zodToJsonSchema(UpdateTaskArgsSchema),
};
export async function handleUpdateTask({ taskID, newDependsOnTaskIDs, newUncertaintyAreas, newDefinitionsOfDone }, taskDB) {
    const task = taskDB.get(taskID);
    if (!task) {
        throw new Error(`Invalid task update: Unknown task ID: ${taskID}`);
    }
    if (task.currentStatus === 'complete') {
        throw new Error(`Invalid task update: Task '${taskID}' is already complete. Use 'transition_task_status' tool to transition task status to 'in-progress' first.`);
    }
    task.dependsOnTaskIDs.push(...newDependsOnTaskIDs);
    const newUncertaintyAreaTasks = createUncertaintyAreaTasks(newUncertaintyAreas, task.title, task.dependsOnTaskIDs);
    for (const uncertaintyAreaTask of newUncertaintyAreaTasks) {
        taskDB.set(uncertaintyAreaTask.taskID, uncertaintyAreaTask);
    }
    task.dependsOnTaskIDs.push(...newUncertaintyAreaTasks.map((task) => task.taskID));
    if (newDefinitionsOfDone) {
        task.definitionsOfDone.push(...newDefinitionsOfDone);
    }
    const res = {
        tasksCreated: newUncertaintyAreaTasks.length > 0 ? newUncertaintyAreaTasks : undefined,
        taskUpdated: task,
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
