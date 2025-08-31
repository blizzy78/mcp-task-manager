import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { type TaskDB } from '../task_db.js'
import {
  DoneStatus,
  FailedStatus,
  TaskComplexitySchema,
  TaskCriticalPathSchema,
  TaskDefinitionsOfDoneSchema,
  TaskDescriptionSchema,
  TaskGoalSchema,
  TaskIDSchema,
  TaskStatusSchema,
  TaskTitleSchema,
  TaskUncertaintyAreasSchema,
  toBasicTaskInfo,
  TodoStatus,
  type Task,
  type TaskStatus,
} from '../tasks.js'

const TaskUpdateSchema = z.object({
  taskID: TaskIDSchema.describe('The identifier of the task to change status'),

  set: z
    .object({
      status: TaskStatusSchema.optional().describe('The new status of this task'),
      title: TaskTitleSchema.optional(),
      description: TaskDescriptionSchema.optional(),
      goal: TaskGoalSchema.optional(),
      criticalPath: TaskCriticalPathSchema.optional(),
      estimatedComplexity: TaskComplexitySchema.optional(),
    })
    .optional()
    .describe('Optional properties to update on this task'),

  add: z
    .object({
      dependsOnTaskIDs: TaskIDSchema.array().min(1).optional().describe('New tasks that this task depends on'),
      definitionsOfDone: TaskDefinitionsOfDoneSchema.optional(),
      uncertaintyAreas: TaskUncertaintyAreasSchema.optional(),
      lessonsLearned: z
        .string()
        .min(1)
        .array()
        .min(1)
        .optional()
        .describe('Lessons learned while executing this task that may inform future tasks'),
      verificationEvidence: z
        .string()
        .min(1)
        .array()
        .min(1)
        .optional()
        .describe(
          'Verification evidence that this task was executed as planned, and that the definitions of done were met'
        ),
    })
    .optional()
    .describe('Optional properties to add to this task'),

  remove: z
    .object({
      dependsOnTaskIDs: TaskIDSchema.array().min(1).optional().describe('Tasks that this task no longer depends on'),
    })
    .optional()
    .describe('Optional properties to remove from this task'),
})

type TaskUpdate = z.infer<typeof TaskUpdateSchema>

export const UpdateTaskArgsSchema = z.object({
  tasks: TaskUpdateSchema.array().min(1).describe('The tasks to update'),
})

type UpdateTaskArgs = z.infer<typeof UpdateTaskArgsSchema>

export const UPDATE_TASK = 'update_task'

export const updateTaskTool = {
  name: UPDATE_TASK,
  title: 'Update tasks',
  description: `Updates the status and/or other properties of one or more tasks.
Must use this tool before executing tasks, and when finished executing tasks.
Should always include lessons learned to inform future tasks.
Important: Always update multiple tasks in a single call if dependencies allow it.`,
  inputSchema: zodToJsonSchema(UpdateTaskArgsSchema),
}

export async function handleUpdateTask({ tasks }: UpdateTaskArgs, taskDB: TaskDB, singleAgent: boolean) {
  const updatedTasks = new Array<Task>()

  for (const taskUpdate of tasks) {
    const task = handleUpdateSingleTask(taskUpdate, taskDB)
    updatedTasks.push(task)
  }

  const taskID = tasks.map((t) => t.taskID)[0]
  const incompleteTaskIDs = taskDB.incompleteTasksInTree(taskID).map((t) => t.taskID)

  const res = {
    tasksUpdated: updatedTasks.map((t) =>
      toBasicTaskInfo(t, false, t.status !== DoneStatus && t.status !== FailedStatus, t.status === TodoStatus)
    ),
    incompleteTasksIdealOrder: singleAgent ? incompleteTaskIDs : undefined,
  }

  return {
    content: [],
    structuredContent: res,
  } satisfies CallToolResult
}

function handleUpdateSingleTask({ taskID, set, add, remove }: TaskUpdate, taskDB: TaskDB) {
  const task = taskDB.get(taskID)
  if (!task) {
    throw new Error(`Task not found: ${taskID}`)
  }

  if (set) {
    const { status: newStatus, title, description, goal, criticalPath, estimatedComplexity } = set

    const oldStatus = task.status

    const critPathDepsNotDone = task.dependsOnTaskIDs.filter((depTaskID) => {
      const depTask = taskDB.get(depTaskID)!
      return depTask.criticalPath && depTask.status !== 'done'
    })

    const transitionValidations: Array<{ from?: TaskStatus; to: TaskStatus; validate: () => void }> = [
      {
        from: DoneStatus,
        to: FailedStatus,

        validate() {
          throw new Error(`Can't transition from ${oldStatus} to ${newStatus}`)
        },
      },

      {
        from: FailedStatus,
        to: DoneStatus,

        validate() {
          throw new Error(`Can't transition from ${oldStatus} to ${newStatus}`)
        },
      },

      {
        to: DoneStatus,

        validate() {
          if (critPathDepsNotDone.length > 0) {
            throw new Error(
              `Can't transition task ${taskID} to ${newStatus}: Critical path dependencies are not ${DoneStatus}: ${critPathDepsNotDone.join(
                ', '
              )}`
            )
          }
        },
      },
    ]

    transitionValidations
      .filter((tv) => !tv.from || tv.from === oldStatus)
      .filter((tv) => tv.to === newStatus)
      .forEach((tv) => tv.validate())

    if (newStatus) {
      task.status = newStatus
    }

    if (title) {
      task.title = title
    }

    if (description) {
      task.description = description
    }

    if (goal) {
      task.goal = goal
    }

    if (typeof criticalPath !== 'undefined') {
      task.criticalPath = criticalPath
    }

    if (estimatedComplexity) {
      task.estimatedComplexity = estimatedComplexity
    }
  }

  if (add) {
    const {
      definitionsOfDone: addDefinitionsOfDone,
      uncertaintyAreas: addUncertaintyAreas,
      lessonsLearned: addLessonsLearned,
      verificationEvidence: addVerificationEvidence,
    } = add

    if (addDefinitionsOfDone) {
      task.definitionsOfDone.push(...addDefinitionsOfDone)
    }

    if (addUncertaintyAreas) {
      task.uncertaintyAreas.push(...addUncertaintyAreas)
    }

    if (addLessonsLearned) {
      task.lessonsLearned.push(...addLessonsLearned)
    }

    if (addVerificationEvidence) {
      task.verificationEvidence.push(...addVerificationEvidence)
    }
  }

  if (remove) {
    const { dependsOnTaskIDs: removeDependsOnTaskIDs } = remove

    if (removeDependsOnTaskIDs) {
      task.dependsOnTaskIDs = task.dependsOnTaskIDs.filter((depTaskID) => !removeDependsOnTaskIDs.includes(depTaskID))
    }
  }

  return task
}
