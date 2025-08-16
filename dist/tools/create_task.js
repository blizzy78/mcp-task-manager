import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { dedup } from './arrays.js';
import { newTaskID, TaskIDSchema, TaskStatusSchema } from './tasks.js';
import { createUncertaintyAreaTasks, UncertaintyAreaSchema } from './uncertainty_area.js';
export const CreateTaskArgsSchema = z.object({
    title: z.string().min(1).describe('A concise title for this task. Must be understandable out of context.'),
    description: z
        .string()
        .min(1)
        .describe('A detailed description of this task. Must be understandable out of context.'),
    goal: z.string().min(1).describe('The overall goal of this task. Must be understandable out of context.'),
    dependsOnTaskIDs: TaskIDSchema.array().describe("A list of task identifiers this task depends on. Must be provided if these tasks must be 'complete' before this task can be 'in-progress'."),
    definitionsOfDone: z
        .string()
        .min(1)
        .array()
        .describe("A detailed list of criteria that must be met for this task to be considered 'complete'. Must be understandable out of context."),
    uncertaintyAreas: UncertaintyAreaSchema.array().describe(`A detailed list of areas where there is uncertainty about this task's requirements or execution.
Must be understandable out of context. Must be ordered by priority. May be empty.`),
});
export const CREATE_TASK = 'create_task';
export const createTaskTool = {
    name: CREATE_TASK,
    title: 'Create task',
    description: `A tool to create a new task that must be performed.
May optionally provide a list of tasks that must be 'complete' first.
Should provide a list of uncertainty areas to clarify before starting this task, if applicable.
All tasks start in the 'not-started' status. Use 'transition_task_status' tool to transition the status of this task.`,
    inputSchema: zodToJsonSchema(CreateTaskArgsSchema),
};
export async function handleCreateTask({ title, description, goal, definitionsOfDone, dependsOnTaskIDs, uncertaintyAreas }, taskDB) {
    for (const dependsOnTaskID of dependsOnTaskIDs) {
        const dependsOnTask = taskDB.get(dependsOnTaskID);
        if (!dependsOnTask) {
            throw new Error(`Invalid task: Unknown dependency task: ${dependsOnTaskID}`);
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
        dependsOnTaskIDs: dedup([...dependsOnTaskIDs, ...newUncertaintyAreaTasks.map((task) => task.taskID)]),
        uncertaintyAreasUpdated: true,
    };
    newTasks.push(task);
    for (const newTask of newTasks) {
        taskDB.set(newTask.taskID, newTask);
    }
    const tasksWithoutUncertaintyAreasUpdated = taskDB.getAllInTree(task.taskID).filter((t) => !t.uncertaintyAreasUpdated);
    const executionConstraints = [
        task.dependsOnTaskIDs.map((id) => taskDB.get(id)).some((t) => t.currentStatus !== 'complete') &&
            `Dependencies of task '${task.taskID}' must be 'complete' first before this task can be 'in-progress'.`,
        tasksWithoutUncertaintyAreasUpdated.length > 0 &&
            `Uncertainty areas must be updated for tasks: ${tasksWithoutUncertaintyAreasUpdated
                .map((t) => `'${t.taskID}'`)
                .join(', ')}. Use 'update_task' tool to do so.`,
        taskDB.getAllInTree(task.taskID).filter((t) => t.currentStatus === 'not-started').length > 1 &&
            `Note: Only one task may be 'in-progress' at any one time.`,
    ].filter(Boolean);
    const res = {
        tasksCreated: newTasks.map((t) => ({
            ...t,
            // we don't want them to see this
            uncertaintyAreasUpdated: undefined,
        })),
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
