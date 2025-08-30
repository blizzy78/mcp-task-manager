import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { mustDecompose, newTaskID, SimpleTaskSchema, TaskComplexitySchema, TaskIDSchema, toBasicTaskInfo, TodoStatus, } from '../tasks.js';
const SubtaskSchema = SimpleTaskSchema.extend({
    estimatedComplexity: TaskComplexitySchema,
    sequenceOrder: z
        .number()
        .int()
        .min(1)
        .describe('The sequence order of this subtask. Subtasks may use the same sequence order if they can be executed in parallel.'),
});
export const DecomposeTaskArgsSchema = z.object({
    taskID: TaskIDSchema.describe('The task to decompose'),
    decompositionReason: z.string().min(1).describe('The reason for decomposing this task'),
    subtasks: SubtaskSchema.array().min(1).describe('Array of smaller, manageable subtasks to create'),
});
export const DECOMPOSE_TASK = 'decompose_task';
export const decomposeTaskTool = {
    name: DECOMPOSE_TASK,
    title: 'Decompose task',
    description: `Decomposes an existing complex task into smaller, more manageable subtasks.
All tasks with complexity higher than low must always be decomposed before execution.
Tasks can only be decomposed while in todo status.
Subtasks with the same sequence order may be executed in parallel.
Subtasks should include a verification subtask.
Created subtasks may be decomposed later if needed.`,
    inputSchema: zodToJsonSchema(DecomposeTaskArgsSchema),
};
export async function handleDecomposeTask({ taskID, subtasks }, taskDB) {
    const parentTask = taskDB.get(taskID);
    if (!parentTask) {
        throw new Error(`Task not found: ${taskID}`);
    }
    if (parentTask.status !== TodoStatus) {
        throw new Error(`Can't decompose task ${taskID} in status: ${parentTask.status}`);
    }
    const seqOrderToTasks = new Map();
    for (const subtask of subtasks) {
        const newTask = {
            taskID: newTaskID(),
            status: TodoStatus,
            dependsOnTaskIDs: [],
            title: subtask.title,
            description: subtask.description,
            goal: subtask.goal,
            definitionsOfDone: subtask.definitionsOfDone,
            criticalPath: !!subtask.criticalPath,
            uncertaintyAreas: subtask.uncertaintyAreas,
            estimatedComplexity: subtask.estimatedComplexity,
            lessonsLearned: [],
            verificationEvidence: [],
        };
        if (!seqOrderToTasks.has(subtask.sequenceOrder)) {
            seqOrderToTasks.set(subtask.sequenceOrder, new Array());
        }
        seqOrderToTasks.get(subtask.sequenceOrder).push(newTask);
    }
    const sortedSeqOrders = Array.from(seqOrderToTasks.keys()).sort((a, b) => a - b);
    for (let i = 1; i < sortedSeqOrders.length; i++) {
        const currentSeqOrder = sortedSeqOrders[i];
        const prevSeqOrder = sortedSeqOrders[i - 1];
        const currentOrderTasks = seqOrderToTasks.get(currentSeqOrder);
        const previousOrderTasks = seqOrderToTasks.get(prevSeqOrder);
        for (const currentOrderTask of currentOrderTasks) {
            currentOrderTask.dependsOnTaskIDs = previousOrderTasks.map((task) => task.taskID);
        }
    }
    const createdTasks = Array.from(seqOrderToTasks.values()).flat();
    for (const task of createdTasks) {
        taskDB.set(task.taskID, task);
    }
    const highestSeqOrderTasks = seqOrderToTasks.get(sortedSeqOrders[sortedSeqOrders.length - 1]);
    parentTask.dependsOnTaskIDs = [...parentTask.dependsOnTaskIDs, ...highestSeqOrderTasks.map((task) => task.taskID)];
    const res = {
        taskUpdated: toBasicTaskInfo(parentTask, false, false, false),
        tasksCreated: createdTasks.map((t) => toBasicTaskInfo(t, false, false, true)),
    };
    return {
        content: [
            createdTasks.some((t) => mustDecompose(t)) &&
                {
                    type: 'text',
                    text: 'Some tasks must be decomposed before execution',
                    audience: ['assistant'],
                },
        ].filter(Boolean),
        structuredContent: res,
    };
}
