import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DoneStatus, FailedStatus, toBasicTaskInfo, TodoStatus } from '../tasks.js';
export const CurrentTaskArgsSchema = z.object({});
export const CURRENT_TASK = 'current_task';
export const currentTaskTool = {
    name: CURRENT_TASK,
    title: 'Get current task',
    description: 'Returns a list of tasks that are currently in progress.',
    inputSchema: zodToJsonSchema(CurrentTaskArgsSchema, { $refStrategy: 'none' }),
};
export async function handleCurrentTask(_, taskDB) {
    const currentTaskID = taskDB.getCurrentTask();
    if (!currentTaskID) {
        const res = { tasks: [] };
        return {
            content: [],
            structuredContent: res,
        };
    }
    const tasksInTree = taskDB.getAllInTree(currentTaskID);
    const incompleteTaskIDs = taskDB.incompleteTasksInTree(currentTaskID).map((t) => t.taskID);
    const res = {
        tasks: tasksInTree.map((t) => toBasicTaskInfo(t, true, t.status !== DoneStatus && t.status !== FailedStatus, t.status === TodoStatus)),
        incompleteTasksIdealOrder: incompleteTaskIDs,
    };
    return {
        content: [
            {
                type: 'text',
                text: "Use 'task_info' tool to retrieve full task details",
                audience: ['assistant'],
            },
        ],
        structuredContent: res,
    };
}
