import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TaskIDSchema } from './tasks.js';
const TaskInfoArgsSchema = z.object({
    taskID: TaskIDSchema.describe('The identifier of a task.'),
});
const TaskInfoArgsSingleAgentSchema = z.object({
    taskID: TaskIDSchema.optional().describe(`The identifier of a task. If not provided, the current 'in-progress' task will be returned, if any.`),
});
export function taskInfoArgsSchema(singleAgent) {
    if (singleAgent) {
        return TaskInfoArgsSingleAgentSchema;
    }
    return TaskInfoArgsSchema;
}
export const TASK_INFO = 'task_info';
export function taskInfoTool(singleAgent) {
    return {
        name: TASK_INFO,
        title: 'Get task info',
        description: 'A tool to retrieve full information about a task.',
        inputSchema: zodToJsonSchema(taskInfoArgsSchema(singleAgent)),
    };
}
export async function handleTaskInfo({ taskID }, taskDB) {
    const returnAllTaskIDsInTree = taskDB.isSingleAgent && !taskID;
    if (taskDB.isSingleAgent && !taskID) {
        taskID = taskDB.getCurrentInProgressTask();
        if (!taskID) {
            throw new Error('No task currently in progress.');
        }
    }
    const task = taskDB.get(taskID);
    if (!task) {
        throw new Error(`Invalid task info request: Unknown task ID: ${taskID}.${taskDB.isSingleAgent
            ? ` Use 'task_info' tool without taskID to retrieve details on current 'in-progress' task.`
            : ''}`);
    }
    const executionConstraints = [
        task.currentStatus === 'in-progress' &&
            task.readonly &&
            `IMPORTANT: Task '${taskID}' is read-only: This task must be performed without making ` +
                'any permanent changes, editing code or any other content is not allowed.',
        task.currentStatus === 'in-progress' &&
            !task.readonly &&
            `Task '${taskID}' is read-write: You are allowed to make changes.`,
        task.currentStatus === 'not-started' &&
            task.dependsOnTaskIDs.map((id) => taskDB.get(id)).some((t) => t.currentStatus !== 'complete') &&
            `Dependencies of task '${taskID}' must be completed first before this task can be started.`,
        task.currentStatus === 'in-progress' &&
            task.definitionsOfDone.length > 0 &&
            `Definitions of done for task '${taskID}' must be met before this task can be considered complete.`,
    ].filter(Boolean);
    const res = {
        task: {
            ...task,
            // we don't want them to see this
            uncertaintyAreasUpdated: undefined,
        },
        executionConstraints: executionConstraints.length > 0 ? executionConstraints : undefined,
        allTaskIDsInTree: returnAllTaskIDsInTree ? taskDB.getAllInTree(task.taskID).map((t) => t.taskID) : undefined,
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
