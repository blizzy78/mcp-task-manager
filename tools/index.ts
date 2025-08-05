import type z from 'zod'
import { CREATE_TASK, CreateTaskArgsSchema, createTaskTool, handleCreateTask } from './create_task.js'
import type { ToolHandler } from './tools.js'
import {
  handleTransitionTaskStatus,
  TRANSITION_TASK_STATUS,
  TransitionTaskStatusArgsSchema,
  transitionTaskStatusTool,
} from './transition_task_status.js'
import { handleUpdateTask, UPDATE_TASK, UpdateTaskArgsSchema, updateTaskTool } from './update_task.js'

export const tools = [createTaskTool, updateTaskTool, transitionTaskStatusTool] as const

export const toolHandlers: Record<string, { handler: ToolHandler; schema: z.ZodTypeAny }> = {
  [CREATE_TASK]: {
    handler: handleCreateTask,
    schema: CreateTaskArgsSchema,
  },
  [UPDATE_TASK]: {
    handler: handleUpdateTask,
    schema: UpdateTaskArgsSchema,
  },
  [TRANSITION_TASK_STATUS]: {
    handler: handleTransitionTaskStatus,
    schema: TransitionTaskStatusArgsSchema,
  },
} as const
