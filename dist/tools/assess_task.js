import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { assessmentId, IDSchema, TaskStatusSchema } from './tasks.js';
const KnowledgeSchema = z.object({
    knowledgeId: IDSchema.describe('The unique identifier for this knowledge.'),
    title: z.string().min(1).describe('A concise title for this knowledge.'),
    description: z.string().min(1).describe('A detailed description of this knowledge.'),
});
const SubtaskSchema = z.object({
    taskId: IDSchema.describe('The unique identifier for this subtask.'),
    title: z.string().min(1).describe('A concise title for this subtask.'),
    description: z.string().min(1).describe('A detailed description of this subtask.'),
    goal: z.string().min(1).describe('The overall goal of this subtask.'),
    missingKnowledge: KnowledgeSchema.array()
        .min(1)
        .optional()
        .describe(`A list of specific knowledge or information that is missing and must be researched or
acquired to complete this subtask. For example, 'Specific shell command to do XYZ.' or
'Determine correct package manager.'
Ensure to always list all missing knowledge that may be required to complete this subtask.
Remember that your knowledge is outdated because your training date is in the past.
Never assume you have all the knowledge needed to complete this subtask without further research.`),
});
export const AssessTaskArgsSchema = z.object({
    taskId: IDSchema.describe('The unique identifier for this task.'),
    parentTaskId: IDSchema.optional().describe('The identifier of the parent task this task belongs to, if applicable.'),
    currentStatus: TaskStatusSchema.describe('The current status of the task.'),
    complexityAssessment: z
        .string()
        .min(1)
        .describe("A detailed assessment of this task's complexity. Describe if this task can be performed all at once, or if it requires performing multiple discrete subtasks instead."),
    complexityAssessmentOutcomeSubtasks: SubtaskSchema.array()
        .min(1)
        .optional()
        .describe(`A list of discrete subtasks that must be performed to perform this task, if applicable.
Tasks with missing knowledge must always have multiple subtasks, so that the knowledge can be acquired
separately before the actual task can be performed.`),
});
export const ASSESS_TASK = 'assess_task';
export const assessTaskTool = {
    name: ASSESS_TASK,
    title: 'Assess task complexity and structure',
    description: `A tool to assess the complexity and structure of a task.
A task can only be assessed if it hasn't been started yet.`,
    inputSchema: zodToJsonSchema(AssessTaskArgsSchema),
};
export async function handleAssessTask({ taskId, parentTaskId, currentStatus, complexityAssessmentOutcomeSubtasks: subtasks, }) {
    if (currentStatus !== 'not-started') {
        throw new Error(`Task '${taskId}' can't be assessed because it has already been started.`);
    }
    const knowledgeTasksNeedingRegistration = subtasks?.flatMap(({ missingKnowledge }) => (missingKnowledge ?? new Array()).map(({ knowledgeId }) => ({
        taskId: `knowledge-${knowledgeId}`,
        parentTaskId: taskId,
    }))) ?? new Array();
    const subtasksNeedingRegistration = subtasks?.map(({ taskId: subtaskId, missingKnowledge }) => ({
        taskId: subtaskId,
        parentTaskId: taskId,
        dependsOnCompletedTaskIds: missingKnowledge
            ? missingKnowledge.map(({ knowledgeId }) => `knowledge-${knowledgeId}`)
            : undefined,
    })) ?? new Array();
    const allTasksNeedingRegistration = [...knowledgeTasksNeedingRegistration, ...subtasksNeedingRegistration];
    const res = {
        assessmentId: assessmentId(taskId),
        taskId,
        parentTaskId,
        tasksNeedingRegistration: allTasksNeedingRegistration.length > 0 ? allTasksNeedingRegistration : undefined,
    };
    const content = [
        {
            type: 'text',
            audience: ['assistant'],
            text: JSON.stringify(res),
        },
    ];
    return {
        content,
        structuredContent: res,
    };
}
