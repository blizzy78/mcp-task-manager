import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { TaskDB } from './task_db.js'
import { TaskIDSchema, TaskStatusSchema } from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'

export const TransitionTaskStatusArgsSchema = z.object({
  taskID: TaskIDSchema.describe('The identifier of this task.'),
  newStatus: TaskStatusSchema.describe('The new status of this task.'),
  outcomeDetails: z
    .string()
    .min(1)
    .optional()
    .describe(`Details about the outcome of this task. Must be provided if transition.newStatus is 'complete'.`),
})

type TransitionTaskStatusArgs = z.infer<typeof TransitionTaskStatusArgsSchema>

export const TRANSITION_TASK_STATUS = 'transition_task_status'

export const transitionTaskStatusTool = {
  name: TRANSITION_TASK_STATUS,
  title: 'Transition task status',
  description: `A tool to transition the status of a task.
Valid task status transitions are:
- not-started -> in-progress (before starting task)
- in-progress -> complete (if task is done)
- complete -> in-progress (if task needs rework)
All tasks this task depends on must be 'complete' before this task can be 'in-progress'.
outcomeDetails must be provided when transitioning this task to 'complete'.`,
  inputSchema: zodToJsonSchema(TransitionTaskStatusArgsSchema),
}

export async function handleTransitionTaskStatus(
  { taskID, newStatus, outcomeDetails }: TransitionTaskStatusArgs,
  taskDB: TaskDB
) {
  const task = taskDB.get(taskID)
  if (!task) {
    throw new Error(`Invalid status transition: Unknown task ID: ${taskID}`)
  }

  switch (task.currentStatus) {
    case 'not-started':
    case 'complete':
      switch (newStatus) {
        case 'in-progress':
          const incompleteDependsOnTask = task.dependsOnTaskIDs
            .map((depID) => taskDB.get(depID)!)
            .find((dep) => dep.currentStatus !== 'complete')

          if (incompleteDependsOnTask) {
            throw new Error(
              `Invalid status transition: Task '${taskID}' depends on task '${incompleteDependsOnTask.taskID}' which is not 'complete'. Use 'transition_task_status' tool to transition that task's status.`
            )
          }

          // okay
          break

        default:
          throw new Error(`Invalid status transition: ${task.currentStatus} -> ${newStatus}`)
      }
      break

    case 'in-progress':
      switch (newStatus) {
        case 'complete':
          // okay
          break

        default:
          throw new Error(`Invalid status transition: ${task.currentStatus} -> ${newStatus}`)
      }
      break

    default:
      throw new Error(`Invalid task status: Invalid current status: ${task.currentStatus}`)
  }

  if (newStatus === 'complete' && !outcomeDetails) {
    throw new Error(`Invalid status transition: Must provide outcomeDetails to complete task '${taskID}'.`)
  }

  task.currentStatus = newStatus

  const res = { taskUpdated: task }

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
