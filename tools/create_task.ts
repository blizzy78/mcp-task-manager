import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { dedup } from './arrays.js'
import { type Task, type TaskDB } from './task_db.js'
import { newTaskID, TaskIDSchema, TaskStatusSchema } from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'
import { createUncertaintyAreaTasks, UncertaintyAreaSchema } from './uncertainty_area.js'

export const CreateTaskArgsSchema = z.object({
  title: z.string().min(1).describe('A concise title for this task.'),
  description: z.string().min(1).describe('A detailed description of this task.'),
  goal: z.string().min(1).describe('The overall goal of this task.'),
  definitionsOfDone: z
    .string()
    .min(1)
    .array()
    .describe('A detailed list of criteria that must be met for this task to be considered complete.'),
  dependsOnTaskIDs: TaskIDSchema.array().describe(
    'A list of task identifiers this task depends on. Must be provided if these tasks must be complete before this task can be started.'
  ),
  uncertaintyAreas: UncertaintyAreaSchema.array().describe(
    "A detailed list of areas where there is uncertainty about this task's requirements or execution. May be empty. Ensure list is ordered by priority."
  ),
})

type CreateTaskArgs = z.infer<typeof CreateTaskArgsSchema>

export const CREATE_TASK = 'create_task'

export const createTaskTool = {
  name: CREATE_TASK,
  title: 'Create task',
  description: `A tool to create a new task that must be completed.
Can optionally provide a list of tasks that must be completed first.
Should provide a list of uncertainty areas to clarify before starting this task.
All tasks start in the 'not-started' status. Use the 'transition_task_status'
tool to transition the status of this task.`,
  inputSchema: zodToJsonSchema(CreateTaskArgsSchema),
}

export async function handleCreateTask(
  { title, description, goal, definitionsOfDone, dependsOnTaskIDs, uncertaintyAreas }: CreateTaskArgs,
  taskDB: TaskDB
) {
  for (const dependsOnTaskID of dependsOnTaskIDs) {
    const dependsOnTask = taskDB.get(dependsOnTaskID)
    if (!dependsOnTask) {
      throw new Error(`Invalid task: Unknown dependency task: ${dependsOnTaskID}`)
    }
  }

  const newTasks = new Array<Task>()

  const newUncertaintyAreaTasks = createUncertaintyAreaTasks(uncertaintyAreas, title, dependsOnTaskIDs)
  newTasks.push(...newUncertaintyAreaTasks)

  const task = {
    taskID: newTaskID(),
    currentStatus: TaskStatusSchema.parse('not-started'),
    title,
    description,
    goal,
    definitionsOfDone,
    dependsOnTaskIDs: dedup([...dependsOnTaskIDs, ...newUncertaintyAreaTasks.map((task) => task.taskID)]),
    uncertaintyAreasUpdated: true,
  } satisfies Task

  newTasks.push(task)

  for (const newTask of newTasks) {
    taskDB.set(newTask.taskID, newTask)
  }

  const tasksWithoutUncertaintyAreasUpdated = taskDB.getAllInTree(task.taskID).filter((t) => !t.uncertaintyAreasUpdated)

  const executionConstraints = [
    task.dependsOnTaskIDs.map((id) => taskDB.get(id)!).some((t) => t.currentStatus !== 'complete') &&
      `Dependencies of task '${task.taskID}' must be completed first before this task can be started.`,

    tasksWithoutUncertaintyAreasUpdated.length > 0 &&
      `Uncertainty areas must be updated for tasks: ${tasksWithoutUncertaintyAreasUpdated
        .map((t) => `'${t.taskID}'`)
        .join(', ')}. Use 'update_task' tool to do so.`,

    taskDB.getAllInTree(task.taskID).filter((t) => t.currentStatus === 'not-started').length > 1 &&
      `Note: Only one task may be 'in-progress' at any one time.`,
  ].filter(Boolean)

  const res = {
    tasksCreated: newTasks.map(
      (t) =>
        ({
          ...t,

          // we don't want them to see this
          uncertaintyAreasUpdated: undefined,
        } satisfies Task)
    ),

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
