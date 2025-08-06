import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { TaskDB } from './task_db.js'
import {
  newUncertaintyAreaID,
  TaskIDSchema,
  UncertaintyAreaStatusSchema,
  UpdatingUncertaintyAreaSchema,
  type UncertaintyArea,
} from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'

export const UpdateTaskArgsSchema = z.object({
  taskID: TaskIDSchema.describe('The identifier of this task.'),
  dependentTaskIDs: TaskIDSchema.array().describe(
    `A list of task identifiers this task depends on. Must be provided if this task can't be started before all of the dependent tasks are complete.`
  ),
  uncertaintyAreas: UpdatingUncertaintyAreaSchema.array().describe(
    `A detailed list of areas where there is uncertainty about the task requirements or execution.
Can be used to update existing areas or add new areas.`
  ),
})

type UpdateTaskArgs = z.infer<typeof UpdateTaskArgsSchema>

export const UPDATE_TASK = 'update_task'

export const updateTaskTool = {
  name: UPDATE_TASK,
  title: 'Update task',
  description: `A tool to update an existing task.
Can be used to change the list of dependent tasks that must be completed first.
Can be used to update the status of existing uncertainty areas for a task.
Can be used to add new uncertainty areas for a task.
A task may only transition to 'in-progress' once all required information has been acquired.`,
  inputSchema: zodToJsonSchema(UpdateTaskArgsSchema),
}

export async function handleUpdateTask({ taskID, uncertaintyAreas, dependentTaskIDs }: UpdateTaskArgs, taskDB: TaskDB) {
  const task = taskDB.get(taskID)
  if (!task) {
    throw new Error(`Invalid task update: Unknown task ID: ${taskID}`)
  }

  if (task.currentStatus === 'complete') {
    throw new Error(
      `Invalid task update: Task '${taskID}' is already complete. Use 'transition_task_status' tool to transition task status to 'in-progress' first.`
    )
  }

  for (const dependentTaskID of dependentTaskIDs) {
    const dependentTask = taskDB.get(dependentTaskID)
    if (!dependentTask) {
      throw new Error(`Invalid task update: Unknown dependent task ID: ${dependentTaskID}`)
    }
  }

  for (const area of uncertaintyAreas) {
    if (!area.uncertaintyAreaID) {
      continue
    }

    const existingArea = task.uncertaintyAreas.find((a) => a.uncertaintyAreaID === area.uncertaintyAreaID)
    if (!existingArea) {
      throw new Error(`Invalid task update: Unknown uncertainty area ID: ${area.uncertaintyAreaID}`)
    }

    if (!area.status) {
      throw new Error(
        `Invalid task update: Invalid update of uncertainty area '${area.uncertaintyAreaID}': Must provide status.`
      )
    }

    if (area.status === 'resolved' && !area.resolution) {
      throw new Error(
        `Invalid task update: Invalid update of uncertainty area '${area.uncertaintyAreaID}': Must provide resolution when updating to status 'resolved'.`
      )
    }
  }

  task.dependentTaskIDs = dependentTaskIDs

  for (const area of uncertaintyAreas) {
    if (!area.uncertaintyAreaID) {
      continue
    }

    const existingArea = task.uncertaintyAreas.find((a) => a.uncertaintyAreaID === area.uncertaintyAreaID)!
    existingArea.status = area.status!
    existingArea.resolution = area.resolution
  }

  for (const area of uncertaintyAreas) {
    if (area.uncertaintyAreaID) {
      continue
    }

    task.uncertaintyAreas.push({
      ...area,
      uncertaintyAreaID: newUncertaintyAreaID(),
      status: UncertaintyAreaStatusSchema.parse('unresolved'),
    } satisfies UncertaintyArea)
  }

  const unresolvedUncertaintyAreas = task.uncertaintyAreas.filter((area) => area.status !== 'resolved').length > 0

  const recommendations = [
    unresolvedUncertaintyAreas &&
      'Use all available tools as appropriate to resolve all remaining uncertainty areas before proceeding with this task.',
    unresolvedUncertaintyAreas && "Use 'update_task' tool to update resolved uncertainty areas for this task.",
  ].filter(Boolean)

  const res = {
    task: {
      taskID: task.taskID,
      dependentTaskIDs,
      uncertaintyAreas: task.uncertaintyAreas,
    },

    recommendations: recommendations.length > 0 ? recommendations : undefined,
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
