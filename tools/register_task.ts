import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { IDSchema } from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'

export const RegisterTaskArgsSchema = z.object({
  taskId: IDSchema.describe('The unique identifier for this task.'),
  parentTaskId: IDSchema.optional().describe(
    'The identifier of the parent task this task belongs to, if applicable. Must be provided if this task is a subtask of another task.'
  ),
  title: z.string().min(1).describe('A concise title for this task.'),
  description: z.string().min(1).describe('A detailed description of this task.'),
  goal: z.string().min(1).describe('The overall goal of this task.'),
  dependsOnCompletedTaskIds: IDSchema.array()
    .min(1)
    .optional()
    .describe(
      "A list of task identifiers this task depends on. Must be provided if this task can't be started before all of the dependent tasks are complete."
    ),
})

type RegisterTaskArgs = z.infer<typeof RegisterTaskArgsSchema>

export const REGISTER_TASK = 'register_task'

export const registerTaskTool = {
  name: REGISTER_TASK,
  title: 'Register task',
  description: `A tool to register a new task that must be performed.
Can optionally be part of a parent task, or specify dependent tasks that must be
completed before this task can be performed.`,
  inputSchema: zodToJsonSchema(RegisterTaskArgsSchema),
}

export async function handleRegisterTask({ taskId, parentTaskId, dependsOnCompletedTaskIds }: RegisterTaskArgs) {
  const res = {
    taskId,
    parentTaskId,
    currentStatus: 'not-started',
    dependsOnCompletedTaskIds,
    needsAssessment: true,
  }

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
