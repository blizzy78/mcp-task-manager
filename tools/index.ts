import type z from 'zod'
import { CREATE_TASK, CreateTaskArgsSchema, createTaskTool, handleCreateTask } from './create_task.js'
import { handleTaskInfo, TASK_INFO, taskInfoArgsSchema, taskInfoTool } from './task_info.js'
import type { ToolHandler } from './tools.js'
import {
  handleTransitionTaskStatus,
  TRANSITION_TASK_STATUS,
  TransitionTaskStatusArgsSchema,
  transitionTaskStatusTool,
} from './transition_task_status.js'
import { handleUpdateTask, UPDATE_TASK, UpdateTaskArgsSchema, updateTaskTool } from './update_task.js'

export type ToolHandlerInfo = {
  handler: ToolHandler
  schema: z.ZodTypeAny
}

export function tools(singleAgent: boolean) {
  return [createTaskTool, updateTaskTool, transitionTaskStatusTool, taskInfoTool(singleAgent)] as const
}

export function toolHandlers(singleAgent: boolean): Readonly<Record<string, ToolHandlerInfo>> {
  return {
    [CREATE_TASK]: {
      handler: handleCreateTask,
      schema: CreateTaskArgsSchema,
    } satisfies ToolHandlerInfo,

    [UPDATE_TASK]: {
      handler: handleUpdateTask,
      schema: UpdateTaskArgsSchema,
    } satisfies ToolHandlerInfo,

    [TRANSITION_TASK_STATUS]: {
      handler: handleTransitionTaskStatus,
      schema: TransitionTaskStatusArgsSchema,
    } satisfies ToolHandlerInfo,

    [TASK_INFO]: {
      handler: handleTaskInfo,
      schema: taskInfoArgsSchema(singleAgent),
    } satisfies ToolHandlerInfo,
  }
}
