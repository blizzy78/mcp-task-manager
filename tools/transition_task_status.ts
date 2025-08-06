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
  recommendedNextTaskID: TaskIDSchema.optional().describe(
    `The identifier of the next task recommended to perform after this one.
Should be provided if transition.newStatus is 'complete', if applicable.`
  ),
})

type TransitionTaskStatusArgs = z.infer<typeof TransitionTaskStatusArgsSchema>

export const TRANSITION_TASK_STATUS = 'transition_task_status'

export const transitionTaskStatusTool = {
  name: TRANSITION_TASK_STATUS,
  title: 'Transition task status',
  description: `A tool to transition the status of a task.
All tasks start in the 'not-started' status.
Valid task status transitions are:
- not-started -> in-progress (before starting task)
- in-progress -> complete (if task is done)
- complete -> in-progress (if task needs rework)
The status of this task's parent task must be 'in-progress' before this task can be 'in-progress'.
The status of this task's dependent tasks must be 'complete' before this task can be 'in-progress'.
The status of this task's subtasks must be 'complete' before this task can be 'complete'.
The status of this task's uncertainty areas must be 'resolved' before this task can be 'in-progress'.
When transitioning this task to 'complete', outcomeDetails must be provided.
When transitioning this task to 'complete', recommendedNextTaskID should be provided, if applicable.`,
  inputSchema: zodToJsonSchema(TransitionTaskStatusArgsSchema),
}

export async function handleTransitionTaskStatus(
  { taskID, newStatus, outcomeDetails, recommendedNextTaskID }: TransitionTaskStatusArgs,
  taskDB: TaskDB
) {
  const task = taskDB.get(taskID)
  if (!task) {
    throw new Error(`Invalid task update: Unknown task ID: ${taskID}`)
  }

  switch (task.currentStatus) {
    case 'not-started':
    case 'complete':
      switch (newStatus) {
        case 'in-progress':
          const parentTaskNotStarted =
            task.parentTaskID && taskDB.get(task.parentTaskID)!.currentStatus !== 'in-progress'

          if (parentTaskNotStarted) {
            throw new Error(
              `Invalid status transition: Parent task '${task.parentTaskID}' must be 'in-progress' first. Use 'transition_task_status' tool to transition parent task's status.`
            )
          }

          const incompleteDependentTask = task.dependentTaskIDs
            .map((depID) => taskDB.get(depID)!)
            .find((dep) => dep.currentStatus !== 'complete')

          if (incompleteDependentTask) {
            throw new Error(
              `Invalid status transition: Dependent task '${incompleteDependentTask.taskID}' must be 'complete' first. Use 'transition_task_status' tool to transition dependent task's status.`
            )
          }

          const unresolvedUncertaintyArea = task.uncertaintyAreas.find((area) => area.status !== 'resolved')
          if (unresolvedUncertaintyArea) {
            throw new Error(
              `Invalid status transition: Must resolve uncertainty area '${unresolvedUncertaintyArea.uncertaintyAreaID}' first. Use 'update_task' tool to update uncertainty areas for this task.`
            )
          }

          break

        default:
          throw new Error(`Invalid status transition: ${task.currentStatus} -> ${newStatus}`)
      }
      break

    case 'in-progress':
      switch (newStatus) {
        case 'complete':
          const incompleteSubtask = taskDB.getSubtasks(taskID).find((subtask) => subtask.currentStatus !== 'complete')
          if (incompleteSubtask) {
            throw new Error(
              `Invalid status transition: Subtask '${incompleteSubtask.taskID}' must be 'complete' first. Use 'transition_task_status' tool to transition subtask's status.`
            )
          }

          break

        default:
          throw new Error(`Invalid status transition: ${task.currentStatus} -> ${newStatus}`)
      }
      break

    default:
      throw new Error(`Invalid task status: Invalid current status: ${task.currentStatus}`)
  }

  if (newStatus === 'complete' && !outcomeDetails) {
    throw new Error(`Invalid status transition: Must provide outcomeDetails to complete task.`)
  }

  task.currentStatus = newStatus

  if (newStatus !== 'complete') {
    recommendedNextTaskID = undefined
  }

  const res = {
    task: {
      taskID,
      currentStatus: task.currentStatus,
    },

    recommendedNextTaskID,
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
