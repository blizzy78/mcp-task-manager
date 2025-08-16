import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { dedup } from './arrays.js'
import { type Task, type TaskDB } from './task_db.js'
import { TaskIDSchema } from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'
import { createUncertaintyAreaTasks, UncertaintyAreaSchema } from './uncertainty_area.js'

const TaskUpdateSchema = z.object({
  taskID: TaskIDSchema.describe('The identifier of this task.'),
  newDependsOnTaskIDs: TaskIDSchema.array().describe('A list of additional task identifiers this task depends on.'),
  newDefinitionsOfDone: z
    .string()
    .min(1)
    .array()
    .min(1)
    .optional()
    .describe(
      "A detailed list of additional criteria that must be met for this task to be considered 'complete'. Must be understandable out of context."
    ),
  newUncertaintyAreas: UncertaintyAreaSchema.array().describe(
    `A detailed list of additional areas where there is uncertainty about this task's requirements or execution.
Must be understandable out of context. Must be ordered by priority. May be empty.`
  ),
})

export const UpdateTaskArgsSchema = z.object({
  updates: TaskUpdateSchema.array().min(1).describe('A list of updates to apply to existing tasks.'),
})

type UpdateTaskArgs = z.infer<typeof UpdateTaskArgsSchema>

export const UPDATE_TASK = 'update_task'

export const updateTaskTool = {
  name: UPDATE_TASK,
  title: 'Update task',
  description: `A tool to update an existing task.
May optionally provide a list of additional dependencies, uncertainty areas, and definitions of done.`,
  inputSchema: zodToJsonSchema(UpdateTaskArgsSchema),
}

export async function handleUpdateTask({ updates }: UpdateTaskArgs, taskDB: TaskDB) {
  for (const { taskID, newDependsOnTaskIDs } of updates) {
    const task = taskDB.get(taskID)
    if (!task) {
      throw new Error(
        `Invalid task update: Unknown task ID: ${taskID}.${
          taskDB.isSingleAgent
            ? ` Use 'task_info' tool without taskID to retrieve details on current 'in-progress' task.`
            : ''
        }`
      )
    }

    if (task.currentStatus === 'complete') {
      throw new Error(
        `Invalid task update: Task '${taskID}' is already complete. Use 'transition_task_status' tool to transition task status to 'in-progress' first.`
      )
    }

    for (const dependsOnTaskID of newDependsOnTaskIDs) {
      const dependsOnTask = taskDB.get(dependsOnTaskID)
      if (!dependsOnTask) {
        throw new Error(`Invalid task update: Unknown dependency task: ${dependsOnTaskID}`)
      }
    }
  }

  const allNewUncertaintyAreaTasks = new Array<Task>()

  for (const { taskID, newDependsOnTaskIDs, newDefinitionsOfDone, newUncertaintyAreas } of updates) {
    const task = taskDB.get(taskID)!

    task.dependsOnTaskIDs.push(...newDependsOnTaskIDs)

    const newUncertaintyAreaTasks = createUncertaintyAreaTasks(newUncertaintyAreas, task.title, task.dependsOnTaskIDs)
    allNewUncertaintyAreaTasks.push(...newUncertaintyAreaTasks)

    for (const uncertaintyAreaTask of newUncertaintyAreaTasks) {
      taskDB.set(uncertaintyAreaTask.taskID, uncertaintyAreaTask)
    }

    task.dependsOnTaskIDs.push(...newUncertaintyAreaTasks.map((task) => task.taskID))

    task.dependsOnTaskIDs = dedup(task.dependsOnTaskIDs)

    if (newDefinitionsOfDone) {
      task.definitionsOfDone.push(...newDefinitionsOfDone)
    }

    task.uncertaintyAreasUpdated = true
  }

  const tasksUpdated = updates.map((u) => u.taskID).map((taskID) => taskDB.get(taskID)!)

  const tasksInTreeWithoutUncertaintyAreas = taskDB
    .getAllInTree(tasksUpdated[0].taskID)
    .filter((t) => !t.uncertaintyAreasUpdated)

  const executionConstraints = [
    tasksInTreeWithoutUncertaintyAreas.length > 0 &&
      `Must use 'update_task' tool to add uncertainty areas to these tasks before they can be 'in-progress': ${tasksInTreeWithoutUncertaintyAreas
        .map((t) => `'${t.taskID}'`)
        .join(', ')}`,
  ].filter(Boolean)

  const res = {
    tasksCreated:
      allNewUncertaintyAreaTasks.length > 0
        ? allNewUncertaintyAreaTasks.map(
            (t) =>
              ({
                ...t,

                // we don't want them to see this
                uncertaintyAreasUpdated: undefined,
              } satisfies Task)
          )
        : undefined,

    tasksUpdated: tasksUpdated.map(
      (task) =>
        ({
          ...task,

          // we don't want them to see this
          uncertaintyAreasUpdated: undefined,
        } satisfies Task)
    ),

    executionConstraints: executionConstraints.length > 0 ? executionConstraints : undefined,
  }

  return {
    content:
      executionConstraints.length > 0
        ? [
            {
              type: 'text',
              audience: ['assistant'],
              text: 'Pay attention to the task execution constraints.',
            } satisfies TextContent,
          ]
        : [],

    structuredContent: res,
  } satisfies ToolResult
}
