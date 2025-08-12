import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { Task, TaskDB } from './task_db.js'
import { TaskIDSchema, TaskStatusSchema } from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'

export const TransitionTaskStatusArgsSchema = z.object({
  taskID: TaskIDSchema.describe('The identifier of this task.'),
  newStatus: TaskStatusSchema.describe('The new status of this task.'),
  outcomeDetails: z
    .string()
    .min(1)
    .array()
    .min(1)
    .optional()
    .describe(`A detailed list of outcomes of this task. Must be provided if newStatus is 'complete'.`),
  verificationEvidence: z
    .string()
    .min(1)
    .array()
    .min(1)
    .optional()
    .describe(`A list of verification evidence for task completion. Must be provided if newStatus is 'complete'.`),
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
outcomeDetails and verificationEvidence must be provided when transitioning this task to 'complete'.`,
  inputSchema: zodToJsonSchema(TransitionTaskStatusArgsSchema),
}

export async function handleTransitionTaskStatus(
  { taskID, newStatus, outcomeDetails, verificationEvidence }: TransitionTaskStatusArgs,
  taskDB: TaskDB
) {
  const task = taskDB.get(taskID)
  if (!task) {
    throw new Error(
      `Invalid status transition: Unknown task ID: ${taskID}.${
        taskDB.isSingleAgent
          ? ` Use 'task_info' tool without taskID to retrieve details on current 'in-progress' task.`
          : ''
      }`
    )
  }

  const inProgressTaskInTree = taskDB.getAllInTree(taskID).find((t) => t.currentStatus === 'in-progress')

  switch (task.currentStatus) {
    case 'not-started':
      switch (newStatus) {
        case 'in-progress':
          if (inProgressTaskInTree) {
            throw new Error(
              `Invalid status transition: Only one task may be 'in-progress' at any one time. Task '${inProgressTaskInTree.taskID}' is already 'in-progress' and must be completed first.`
            )
          }

          if (!task.uncertaintyAreasUpdated) {
            throw new Error(
              `Invalid status transition: Uncertainty areas for task '${taskID}' must be updated before it can be started. Use 'update_task' tool to do so.`
            )
          }

          // okay
          break

        case 'complete':
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

    case 'complete':
      switch (newStatus) {
        case 'in-progress':
          if (inProgressTaskInTree) {
            throw new Error(
              `Invalid status transition: Only one task may ever be 'in-progress'. Task '${inProgressTaskInTree.taskID}' must be completed first.`
            )
          }

          // okay
          break

        default:
          throw new Error(`Invalid status transition: ${task.currentStatus} -> ${newStatus}`)
      }
      break

    default:
      throw new Error(`Invalid task status: Invalid current status: ${task.currentStatus}`)
  }

  if (newStatus === 'complete' && (!outcomeDetails || outcomeDetails.length === 0)) {
    throw new Error(`Invalid status transition: Must provide outcomeDetails to complete task '${taskID}'.`)
  }

  if (newStatus === 'complete' && (!verificationEvidence || verificationEvidence.length === 0)) {
    throw new Error(`Invalid status transition: Must provide verificationEvidence to complete task '${taskID}'.`)
  }

  if (task.currentStatus === 'in-progress' && newStatus !== 'in-progress') {
    taskDB.setCurrentInProgressTask(undefined)
  }

  task.currentStatus = newStatus

  if (newStatus === 'in-progress') {
    taskDB.setCurrentInProgressTask(taskID)
  }

  const executionConstraints = [
    newStatus === 'in-progress' &&
      task.readonly &&
      `IMPORTANT: Task '${taskID}' is read-only: This task must be performed without making ` +
        'any permanent changes, editing code or any other content is not allowed.',

    newStatus === 'in-progress' && !task.readonly && `Task '${taskID}' is read-write: You are allowed to make changes.`,

    newStatus === 'in-progress' &&
      task.definitionsOfDone.length > 0 &&
      `Definitions of done for task '${taskID}' must be met before this task can be considered complete.`,
  ].filter(Boolean)

  const res = {
    taskUpdated: {
      ...task,

      // we don't want them to see this
      uncertaintyAreasUpdated: undefined,
    } satisfies Task,

    executionConstraints: executionConstraints.length > 0 ? executionConstraints : undefined,
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
