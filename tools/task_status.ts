import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { assessmentId, IDSchema, TaskStatusSchema } from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'

const DependentTaskSchema = z.object({
  taskId: IDSchema.describe('The unique identifier of the dependent task.'),
  currentStatus: TaskStatusSchema.describe('The current status of the dependent task.'),
})

export const TaskStatusArgsSchema = z.object({
  taskId: IDSchema.describe('The unique identifier of this task.'),
  parentTask: z
    .object({
      taskId: IDSchema.describe('The unique identifier of the parent task.'),
      currentStatus: TaskStatusSchema.describe('The current status of the parent task.'),
    })
    .optional()
    .describe(
      'Details about the parent task this task belongs to, if applicable. Must be provided if this task is a subtask of another task.'
    ),
  dependsOnTasks: DependentTaskSchema.array()
    .min(1)
    .optional()
    .describe(
      "A list of tasks this task depends on. Must be provided if this task can't be started before the dependent tasks are complete."
    ),
  assessmentId: z
    .string()
    .min(1)
    .describe(
      `The unique identifier of the complexity and structure assessment for this task.
Must be acquired by using the 'assess_task' tool before this task can be started.`
    ),
  currentStatus: TaskStatusSchema.describe(
    `The current status of this task.

Can only be 'in-progress' if:
- This task hasn't been started yet.
- This task has been assessed.
- All dependent tasks are complete, if applicable.
- This task's parent task is in progress, if applicable.

Can only be 'complete' if:
- This task is currently in progress.
- All subtasks are complete, if applicable.`
  ),
  outcomeDetails: z
    .string()
    .min(1)
    .optional()
    .describe('Details about the outcome of this task. Must be provided if the status is complete.'),
  recommendedNextTaskId: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The identifier of the next recommended task to perform after this one. May only be provided if the status is complete.'
    ),
})

type TaskStatusArgs = z.infer<typeof TaskStatusArgsSchema>

export const TASK_STATUS = 'task_status'

export const taskStatusTool = {
  name: TASK_STATUS,
  title: 'Update task status',
  description: `A tool to update the status of a task.
Must be used when beginning and completing a task.
A task must be assessed before it can be started.
A task's parent task must be in progress first for subtasks to be started or completed.`,
  inputSchema: zodToJsonSchema(TaskStatusArgsSchema),
}

export async function handleTaskStatus({
  taskId,
  parentTask,
  assessmentId: assId,
  dependsOnTasks,
  currentStatus,
  recommendedNextTaskId,
}: TaskStatusArgs) {
  if (assId !== assessmentId(taskId)) {
    throw new Error(
      `Invalid assessment ID '${assId}' for task '${taskId}'. Use the 'assess_task' tool to assess this task.`
    )
  }

  if (currentStatus !== 'not-started' && parentTask && parentTask.currentStatus !== 'in-progress') {
    throw new Error(
      `Task '${taskId}' can't be started unless parent task '${parentTask.taskId}' has been started. Use the 'task_status' tool to update the parent task's status.`
    )
  }

  if (currentStatus !== 'not-started' && dependsOnTasks?.find((dep) => dep.currentStatus !== 'complete')) {
    throw new Error(
      `Task '${taskId}' can't be started unless all dependent tasks are complete. Use the 'task_status' tool to update the dependent tasks' statuses.`
    )
  }

  const res = { taskId, parentTask, assessmentId: assId, dependsOnTasks, currentStatus, recommendedNextTaskId }

  return {
    content: [
      {
        type: 'text',
        audience: ['assistant'],
        text: JSON.stringify(res),
      } satisfies TextContent,
    ],

    structuredContent: res,
  } satisfies ToolResult
}
