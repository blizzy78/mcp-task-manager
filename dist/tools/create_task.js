import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { newTaskID, TaskIDSchema, TaskStatusSchema } from './tasks.js';
import { createUncertaintyAreaTasks, UncertaintyAreaSchema } from './uncertainty_area.js';
export const CreateTaskArgsSchema = z.object({
    title: z.string().min(1).describe('A concise title for this task.'),
    description: z.string().min(1).describe('A detailed description of this task.'),
    goal: z.string().min(1).describe('The overall goal of this task.'),
    definitionsOfDone: z
        .string()
        .min(1)
        .array()
        .describe('A detailed list of criteria that must be met for this task to be considered complete.'),
    dependsOnTaskIDs: TaskIDSchema.array().describe('A list of task identifiers this task depends on. Must be provided if these tasks must be complete before this task can be started.'),
    uncertaintyAreas: UncertaintyAreaSchema.array().describe("A detailed list of areas where there is uncertainty about this task's requirements or execution."),
});
export const CREATE_TASK = 'create_task';
export const createTaskTool = {
    name: CREATE_TASK,
    title: 'Create task',
    description: `A tool to create a new task that must be completed.
Can optionally provide a list of tasks that must be completed first.
Should provide a list of uncertainty areas to clarify before starting this task.
All tasks start in the 'not-started' status. Use the 'transition_task_status'
tool to transition the status of this task.`,
    inputSchema: zodToJsonSchema(CreateTaskArgsSchema),
};
export async function handleCreateTask({ title, description, goal, definitionsOfDone, dependsOnTaskIDs, uncertaintyAreas }, taskDB) {
    for (const dependsOnTaskID of dependsOnTaskIDs) {
        const dependsOnTask = taskDB.get(dependsOnTaskID);
        if (!dependsOnTask) {
            throw new Error(`Invalid task: Unknown dependent task ID: ${dependsOnTaskID}`);
        }
    }
    const newTasks = new Array();
    const newUncertaintyAreaTasks = createUncertaintyAreaTasks(uncertaintyAreas, title, dependsOnTaskIDs);
    newTasks.push(...newUncertaintyAreaTasks);
    const task = {
        taskID: newTaskID(),
        currentStatus: TaskStatusSchema.parse('not-started'),
        title,
        description,
        goal,
        definitionsOfDone,
        dependsOnTaskIDs: [...dependsOnTaskIDs, ...newUncertaintyAreaTasks.map((task) => task.taskID)],
    };
    newTasks.push(task);
    for (const newTask of newTasks) {
        taskDB.set(newTask.taskID, newTask);
    }
    const executionConstraints = [
        newUncertaintyAreaTasks.length > 0 &&
            `Dependencies of task '${task.taskID}' must be completed first before this task can be started.`,
    ].filter(Boolean);
    const res = {
        tasksCreated: newTasks,
        executionConstraints: executionConstraints.length > 0 ? executionConstraints : undefined,
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
