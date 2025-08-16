import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { dedup } from './arrays.js'
import { type Task, type TaskDB } from './task_db.js'
import { TaskIDSchema } from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'
import { createUncertaintyAreaTasks, UncertaintyAreaSchema } from './uncertainty_area.js'

export const UpdateTaskArgsSchema = z.object({
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

type UpdateTaskArgs = z.infer<typeof UpdateTaskArgsSchema>

export const UPDATE_TASK = 'update_task'

export const updateTaskTool = {
  name: UPDATE_TASK,
  title: 'Update task',
  description: `A tool to update an existing task.
May optionally provide a list of additional dependencies, uncertainty areas, and definitions of done.`,
  inputSchema: zodToJsonSchema(UpdateTaskArgsSchema),
}

export async function handleUpdateTask(
  { taskID, newDependsOnTaskIDs, newUncertaintyAreas, newDefinitionsOfDone }: UpdateTaskArgs,
  taskDB: TaskDB
) {
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

  task.dependsOnTaskIDs.push(...newDependsOnTaskIDs)

  const newUncertaintyAreaTasks = createUncertaintyAreaTasks(newUncertaintyAreas, task.title, task.dependsOnTaskIDs)
  for (const uncertaintyAreaTask of newUncertaintyAreaTasks) {
    taskDB.set(uncertaintyAreaTask.taskID, uncertaintyAreaTask)
  }

  task.dependsOnTaskIDs.push(...newUncertaintyAreaTasks.map((task) => task.taskID))

  task.dependsOnTaskIDs = dedup(task.dependsOnTaskIDs)

  if (newDefinitionsOfDone) {
    task.definitionsOfDone.push(...newDefinitionsOfDone)
  }

  task.uncertaintyAreasUpdated = true

  const tasksWithoutUncertaintyAreas = taskDB.getAllInTree(task.taskID).filter((t) => !t.uncertaintyAreasUpdated)

  const executionConstraints = [
    tasksWithoutUncertaintyAreas.length > 0 &&
      `Uncertainty areas must be updated for tasks: ${tasksWithoutUncertaintyAreas
        .map((t) => `'${t.taskID}'`)
        .join(', ')}. Use 'update_task' tool to do so.`,
  ].filter(Boolean)

  const res = {
    tasksCreated:
      newUncertaintyAreaTasks.length > 0
        ? newUncertaintyAreaTasks.map(
            (t) =>
              ({
                ...t,

                // we don't want them to see this
                uncertaintyAreasUpdated: undefined,
              } satisfies Task)
          )
        : undefined,

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
