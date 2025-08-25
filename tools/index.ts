import type z from 'zod'
import { CREATE_TASK, CreateTaskArgsSchema, createTaskTool, handleCreateTask } from './create_task.js'
import { CURRENT_TASK, CurrentTaskArgsSchema, currentTaskTool, handleCurrentTask } from './current_task.js'
import { DECOMPOSE_TASK, DecomposeTaskArgsSchema, decomposeTaskTool, handleDecomposeTask } from './decompose_task.js'
import { handleTaskInfo, TASK_INFO, TaskInfoArgsSchema, taskInfoTool } from './task_info.js'
import type { ToolHandler } from './tools.js'
import { handleUpdateTask, UPDATE_TASK, UpdateTaskArgsSchema, updateTaskTool } from './update_task.js'

export type ToolHandlerInfo = {
  handler: ToolHandler
  schema: z.ZodTypeAny
}

export function tools(singleAgent: boolean) {
  if (!singleAgent) {
    return [createTaskTool, decomposeTaskTool, updateTaskTool, taskInfoTool] as const
  }

  return [createTaskTool, decomposeTaskTool, updateTaskTool, taskInfoTool, currentTaskTool] as const
}

export function toolHandlers(): Readonly<Record<string, ToolHandlerInfo>> {
  return {
    [CREATE_TASK]: {
      handler: handleCreateTask,
      schema: CreateTaskArgsSchema,
    } satisfies ToolHandlerInfo,

    [DECOMPOSE_TASK]: {
      handler: handleDecomposeTask,
      schema: DecomposeTaskArgsSchema,
    } satisfies ToolHandlerInfo,

    [UPDATE_TASK]: {
      handler: handleUpdateTask,
      schema: UpdateTaskArgsSchema,
    } satisfies ToolHandlerInfo,

    [TASK_INFO]: {
      handler: handleTaskInfo,
      schema: TaskInfoArgsSchema,
    } satisfies ToolHandlerInfo,

    [CURRENT_TASK]: {
      handler: handleCurrentTask,
      schema: CurrentTaskArgsSchema,
    } satisfies ToolHandlerInfo,
  }
}
