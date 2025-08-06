import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { TaskDB } from './task_db.js'
import {
  InitialUncertaintyAreaSchema,
  newTaskID,
  newUncertaintyAreaID,
  TaskIDSchema,
  TaskStatusSchema,
  UncertaintyAreaStatusSchema,
  type Task,
  type UncertaintyArea,
} from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'

export const CreateTaskArgsSchema = z.object({
  title: z.string().min(1).describe('A concise title for this task.'),
  description: z.string().min(1).describe('A detailed description of this task.'),
  goal: z.string().min(1).describe('The overall goal of this task.'),
  parentTaskID: TaskIDSchema.optional().describe(
    'The identifier of the parent task this task belongs to, if applicable. Must be provided if this task is a subtask of another task.'
  ),
  dependentTaskIDs: TaskIDSchema.array().describe(
    `A list of task identifiers this task depends on. Must be provided if this task can't be started before all of the dependent tasks are complete.`
  ),
  uncertaintyAreas: InitialUncertaintyAreaSchema.array().describe(
    'A detailed list of areas where there is uncertainty about the task requirements or execution.'
  ),
})

type CreateTaskArgs = z.infer<typeof CreateTaskArgsSchema>

export const CREATE_TASK = 'create_task'

export const createTaskTool = {
  name: CREATE_TASK,
  title: 'Create task',
  description: `A tool to create a new task that must be completed.
Tasks can optionally be part of a parent task, forming a tree-like structure.
Can optionally provide a list of dependent tasks that must be completed first.
Should provide a list of uncertainty areas to clarify before starting the task.
All tasks start in the 'not-started' status. Use the 'transition_task_status'
tool to transition the status of a task.`,
  inputSchema: zodToJsonSchema(CreateTaskArgsSchema),
}

export async function handleCreateTask(
  { title, description, goal, parentTaskID, dependentTaskIDs, uncertaintyAreas }: CreateTaskArgs,
  taskDB: TaskDB
) {
  if (parentTaskID) {
    const parentTask = taskDB.get(parentTaskID)
    if (!parentTask) {
      throw new Error(`Invalid task: Unknown parent task ID: ${parentTaskID}`)
    }

    if (parentTask.currentStatus === 'complete') {
      throw new Error(
        `Invalid task: Parent task '${parentTaskID}' is already complete. Use 'transition_task_status' tool to transition parent task status to 'in-progress' first.`
      )
    }
  }

  for (const dependentTaskID of dependentTaskIDs) {
    const dependentTask = taskDB.get(dependentTaskID)
    if (!dependentTask) {
      throw new Error(`Invalid task: Unknown dependent task ID: ${dependentTaskID}`)
    }
  }

  const task = {
    taskID: newTaskID(),
    currentStatus: TaskStatusSchema.parse('not-started'),
    title,
    description,
    goal,
    parentTaskID,
    dependentTaskIDs,

    uncertaintyAreas: uncertaintyAreas.map(
      (area) =>
        ({
          ...area,
          uncertaintyAreaID: newUncertaintyAreaID(),
          status: UncertaintyAreaStatusSchema.parse('unresolved'),
        } satisfies UncertaintyArea)
    ),
  } satisfies Task

  taskDB.set(task.taskID, task)

  const recommendations = [
    'Use all available tools as appropriate to resolve all remaining uncertainty areas before proceeding with this task.',
    "Use 'update_task' tool to update resolved uncertainty areas for this task.",
  ]

  const res = {
    task: {
      taskID: task.taskID,
      currentStatus: task.currentStatus,
      uncertaintyAreas: task.uncertaintyAreas,
    },

    recommendations,
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
