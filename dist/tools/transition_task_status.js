import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DependentTaskSchema, TaskIDSchema, TaskStatusSchema } from './tasks.js';
export const TransitionTaskStatusArgsSchema = z.object({
    taskID: TaskIDSchema.describe('The identifier of this task.'),
    title: z.string().min(1).describe('The title of this task.'),
    parentTask: z
        .object({
        taskID: TaskIDSchema.describe('The identifier of the parent task.'),
        currentStatus: TaskStatusSchema.describe('The current status of the parent task.'),
    })
        .optional()
        .describe('Details about the parent task this task belongs to, if applicable. Must be provided if this task is a subtask of another task.'),
    transition: z
        .object({
        oldStatus: TaskStatusSchema.describe('The old status of this task.'),
        newStatus: TaskStatusSchema.describe('The new status of this task.'),
    })
        .describe('The desired status transition for this task.'),
    dependsOnTasks: DependentTaskSchema.array()
        .min(1)
        .optional()
        .describe("A list of tasks this task depends on. Must be provided if this task can't be started before the dependent tasks are complete."),
    uncertaintyAreasRemaining: z.boolean().describe(`Whether areas of uncertainty remain for this task.
Tasks may not transition to 'in-progress' until this is false.`),
    outcomeDetails: z
        .string()
        .min(1)
        .optional()
        .describe(`Details about the outcome of this task. Must be provided if transition.newStatus is 'complete'.`),
    recommendedNextTaskID: TaskIDSchema.optional().describe(`The identifier of the next task recommended to perform after this one.
Must be provided if transition.newStatus is 'complete'.`),
});
export const TRANSITION_TASK_STATUS = 'transition_task_status';
export const transitionTaskStatusTool = {
    name: TRANSITION_TASK_STATUS,
    title: 'Transition task status',
    description: `A tool to transition the status of a task.
All tasks start in the 'not-started' status.
Valid task status transitions are:
- not-started -> in-progress (before starting task)
- in-progress -> complete (if task is done)
- complete -> in-progress (if task needs rework)
The status of a task's parent task must be 'in-progress' before this task can be started.
When transitioning to 'complete', outcomeDetails must be provided.
When transitioning to 'complete', recommendedNextTaskID should be provided, if applicable.`,
    inputSchema: zodToJsonSchema(TransitionTaskStatusArgsSchema),
};
export async function handleTransitionTaskStatus({ taskID, parentTask, transition: { oldStatus, newStatus }, dependsOnTasks, uncertaintyAreasRemaining, outcomeDetails, recommendedNextTaskID, }) {
    let validTransition = true;
    let invalidTransitionReason;
    switch (oldStatus) {
        case 'not-started':
            switch (newStatus) {
                case 'in-progress':
                    validTransition = !uncertaintyAreasRemaining;
                    invalidTransitionReason =
                        'Use available tools as appropriate to research all required information before starting this task.';
                    break;
                default:
                    validTransition = false;
                    break;
            }
            break;
        case 'in-progress':
            switch (newStatus) {
                case 'complete':
                    // okay
                    break;
                default:
                    validTransition = false;
                    break;
            }
            break;
        case 'complete':
            switch (newStatus) {
                case 'in-progress':
                    // okay
                    break;
                default:
                    validTransition = false;
                    break;
            }
            break;
        default:
            throw new Error(`Invalid old status for task '${taskID}': ${oldStatus}`);
    }
    if (!validTransition) {
        throw new Error(`Invalid status transition for task '${taskID}': ${oldStatus} -> ${newStatus}.${invalidTransitionReason ? ` ${invalidTransitionReason}` : ''}`);
    }
    if (newStatus !== 'not-started' && parentTask && parentTask.currentStatus !== 'in-progress') {
        throw new Error(`Task '${taskID}' can't be started: parent task '${parentTask.taskID}' must be started first. Use 'transition_task_status' tool to transition parent task's status.`);
    }
    if (newStatus !== 'not-started') {
        const depTaskID = dependsOnTasks?.find((dep) => dep.currentStatus !== 'complete')?.taskID;
        if (depTaskID) {
            throw new Error(`Task '${taskID}' can't be started: dependent task '${depTaskID}' is not complete. Use 'transition_task_status' tool to transition dependent task's status.`);
        }
    }
    if (newStatus === 'complete' && !outcomeDetails) {
        throw new Error(`Invalid status transition for task '${taskID}': must provide outcomeDetails to complete task.`);
    }
    if (newStatus !== 'complete') {
        recommendedNextTaskID = undefined;
    }
    const res = { recommendedNextTaskID };
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
                text: `Transitioned status of task '${taskID}': ${oldStatus} -> ${newStatus}.${recommendedNextTaskID ? ` Recommended task to perform next: ${recommendedNextTaskID}.` : ''}`,
            },
        ],
        structuredContent: res,
    };
}
