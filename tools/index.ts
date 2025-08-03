import type z from 'zod'
import { ASSESS_TASK, AssessTaskArgsSchema, assessTaskTool, handleAssessTask } from './assess_task.js'
import { handleRegisterTask, REGISTER_TASK, RegisterTaskArgsSchema, registerTaskTool } from './register_task.js'
import { handleTaskStatus, TASK_STATUS, TaskStatusArgsSchema, taskStatusTool } from './task_status.js'
import type { ToolHandler } from './tools.js'

export const tools = [assessTaskTool, taskStatusTool, registerTaskTool] as const

export const toolHandlers: Record<string, { handler: ToolHandler; schema: z.ZodTypeAny }> = {
  [ASSESS_TASK]: {
    handler: handleAssessTask,
    schema: AssessTaskArgsSchema,
  },
  [TASK_STATUS]: {
    handler: handleTaskStatus,
    schema: TaskStatusArgsSchema,
  },
  [REGISTER_TASK]: {
    handler: handleRegisterTask,
    schema: RegisterTaskArgsSchema,
  },
} as const
