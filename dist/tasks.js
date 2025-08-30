import { nanoid } from 'nanoid';
import { z } from 'zod';
const IDSchema = z.string().min(1).brand('id');
export const TaskIDSchema = IDSchema.brand('task');
export const TaskStatusSchema = z.enum(['todo', 'in-progress', 'done', 'failed']).brand('task-status');
export const TodoStatus = TaskStatusSchema.parse('todo');
export const InProgressStatus = TaskStatusSchema.parse('in-progress');
export const DoneStatus = TaskStatusSchema.parse('done');
export const FailedStatus = TaskStatusSchema.parse('failed');
export const TaskTitleSchema = z
    .string()
    .min(1)
    .describe('A concise title for this task. Must be understandable out of context');
export const TaskDescriptionSchema = z
    .string()
    .min(1)
    .describe('A detailed description of this task. Must be understandable out of context');
export const TaskDefinitionsOfDoneSchema = z
    .string()
    .min(1)
    .array()
    .describe("A detailed list of criteria that must be met for this task to be considered 'complete'. Must be understandable out of context.");
export const TaskGoalSchema = z
    .string()
    .min(1)
    .describe('The overall goal of this task. Must be understandable out of context');
export const TaskCriticalPathSchema = z
    .boolean()
    .describe('Whether this task is on the critical path and required for completion');
export const TaskUncertaintyAreaSchema = z.object({
    title: z.string().min(1).describe('A concise title for this uncertainty area'),
    description: z.string().min(1).describe('A description of this uncertainty area'),
});
export const TaskUncertaintyAreasSchema = TaskUncertaintyAreaSchema.array().describe(`A detailed list of areas where there is uncertainty about this task's requirements or execution.
Must be understandable out of context. May be empty.`);
export const TaskComplexityLevelSchema = z.enum([
    'trivial',
    'low, may benefit from decomposition before execution',
    'average, must decompose before execution',
    'medium, must decompose before execution',
    'high, must decompose before execution',
]);
export const TrivialTaskComplexityLevel = TaskComplexityLevelSchema.parse('trivial');
export const LowTaskComplexityLevel = TaskComplexityLevelSchema.parse('low, may benefit from decomposition before execution');
export const TaskComplexitySchema = z.object({
    level: TaskComplexityLevelSchema.describe('The level of complexity for this task'),
    description: z.string().min(1).describe('A description of the complexity of this task'),
}).describe(`An estimate of the complexity of this task.
All tasks with complexity higher than low must be decomposed into smaller, more manageable subtasks before execution.
Caution: Don't underestimate complexity.`);
export const SimpleTaskSchema = z.object({
    title: TaskTitleSchema,
    description: TaskDescriptionSchema,
    goal: TaskGoalSchema,
    criticalPath: TaskCriticalPathSchema,
    definitionsOfDone: TaskDefinitionsOfDoneSchema,
    uncertaintyAreas: TaskUncertaintyAreasSchema,
});
export function newTaskID() {
    let id;
    do {
        id = nanoid(10);
    } while (!/^[a-zA-Z0-9].*[a-zA-Z0-9]$/.test(id));
    return TaskIDSchema.parse(id);
}
export function toBasicTaskInfo(task, includeStatus, includeDeps, includeDecomposeInfo) {
    const { taskID, status, title, dependsOnTaskIDs } = task;
    return {
        taskID,
        status: includeStatus ? status : undefined,
        title,
        dependsOnTaskIDs: includeDeps ? dependsOnTaskIDs : undefined,
        mustDecomposeBeforeExecution: includeDecomposeInfo && mustDecompose(task) ? true : undefined,
    };
}
export function mustDecompose(task) {
    return (task.estimatedComplexity &&
        task.estimatedComplexity.level != TrivialTaskComplexityLevel &&
        task.estimatedComplexity.level != LowTaskComplexityLevel);
}
