import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { newTaskID } from './task_db.js';
import { TaskIDSchema, TaskStatusSchema } from './tasks.js';
import { UncertaintyAreaSchema } from './uncertainty_area.js';
export const UpdateTaskArgsSchema = z.object({
    taskID: TaskIDSchema.describe('The identifier of this task.'),
    newDependsOnTaskIDs: TaskIDSchema.array().describe('A list of additional task identifiers this task depends on.'),
    newUncertaintyAreas: UncertaintyAreaSchema.array().describe("A detailed list of additional areas where there is uncertainty about this task's requirements or execution."),
});
export const UPDATE_TASK = 'update_task';
export const updateTaskTool = {
    name: UPDATE_TASK,
    title: 'Update task',
    description: `A tool to update an existing task.
Can optionally provide a list of additional tasks that must be completed first.
Can optionally provide a list of additional uncertainty areas to clarify before starting this task.`,
    inputSchema: zodToJsonSchema(UpdateTaskArgsSchema),
};
export async function handleUpdateTask({ taskID, newDependsOnTaskIDs: dependsOnTaskIDs, newUncertaintyAreas: uncertaintyAreas }, taskDB) {
    const task = taskDB.get(taskID);
    if (!task) {
        throw new Error(`Invalid task update: Unknown task ID: ${taskID}`);
    }
    if (task.currentStatus === 'complete') {
        throw new Error(`Invalid task update: Task '${taskID}' is already complete. Use 'transition_task_status' tool to transition task status to 'in-progress' first.`);
    }
    const newUncertaintyAreaTasks = new Array();
    for (const area of uncertaintyAreas) {
        newUncertaintyAreaTasks.push({
            taskID: newTaskID(),
            currentStatus: TaskStatusSchema.parse('not-started'),
            title: area.title,
            description: `Gain understanding about: ${area.description}`,
            goal: `Resolve uncertainty: ${area.title}`,
            dependsOnTaskIDs,
        });
    }
    task.dependsOnTaskIDs.push(...newUncertaintyAreaTasks.map((task) => task.taskID));
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
