import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { newTaskID, type Task, type TaskDB } from './task_db.js'
import { TaskIDSchema, TaskStatusSchema } from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'
import { UncertaintyAreaSchema } from './uncertainty_area.js'

export const CreateTaskArgsSchema = z.object({
  title: z.string().min(1).describe('A concise title for this task.'),
  description: z.string().min(1).describe('A detailed description of this task.'),
  goal: z.string().min(1).describe('The overall goal of this task.'),
  dependsOnTaskIDs: TaskIDSchema.array().describe(
    'A list of task identifiers this task depends on. Must be provided if these tasks must be complete before this task can be started.'
  ),
  uncertaintyAreas: UncertaintyAreaSchema.array().describe(
    "A detailed list of areas where there is uncertainty about this task's requirements or execution."
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
  { title, description, goal, dependsOnTaskIDs, uncertaintyAreas }: CreateTaskArgs,
  taskDB: TaskDB
) {
  for (const dependsOnTaskID of dependsOnTaskIDs) {
    const dependsOnTask = taskDB.get(dependsOnTaskID)
    if (!dependsOnTask) {
      throw new Error(`Invalid task: Unknown dependent task ID: ${dependsOnTaskID}`)
    }
  }

  const newUncertaintyAreaTasks = new Array<Task>()
  for (const area of uncertaintyAreas) {
    newUncertaintyAreaTasks.push({
      taskID: newTaskID(),
      currentStatus: TaskStatusSchema.parse('not-started'),
      title: `${title} - Uncertainty: ${area.title}`,
      description: `Gain understanding about: ${area.description}`,
      goal: `Resolve uncertainty: ${area.title}`,
      dependsOnTaskIDs,
    } satisfies Task)
  }

  const newTasks = new Array<Task>()
  newTasks.push(...newUncertaintyAreaTasks)

  newTasks.push({
    taskID: newTaskID(),
    currentStatus: TaskStatusSchema.parse('not-started'),
    title,
    description,
    goal,
    dependsOnTaskIDs: [...dependsOnTaskIDs, ...newUncertaintyAreaTasks.map((task) => task.taskID)],
  } satisfies Task)

  for (const newTask of newTasks) {
    taskDB.set(newTask.taskID, newTask)
  }

  const res = { tasksCreated: newTasks }

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
