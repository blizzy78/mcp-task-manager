import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { Task, TaskDB } from './task_db.js'
import { TaskIDSchema } from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'

const TaskInfoArgsSchema = z.object({
  taskID: TaskIDSchema.describe('The identifier of a task.'),
})

type TaskInfoArgs = z.infer<typeof TaskInfoArgsSchema>

const TaskInfoArgsSingleAgentSchema = z.object({
  taskID: TaskIDSchema.optional().describe(
    `The identifier of a task. If not provided, the current 'in-progress' task will be returned, if any.`
  ),
})

type TaskInfoArgsSingleAgent = z.infer<typeof TaskInfoArgsSingleAgentSchema>

export function taskInfoArgsSchema(singleAgent: boolean) {
  if (singleAgent) {
    return TaskInfoArgsSingleAgentSchema
  }

  return TaskInfoArgsSchema
}

export const TASK_INFO = 'task_info'

export function taskInfoTool(singleAgent: boolean) {
  return {
    name: TASK_INFO,
    title: 'Get task info',
    description: 'A tool to retrieve full information about a task.',
    inputSchema: zodToJsonSchema(taskInfoArgsSchema(singleAgent)),
  }
}

export async function handleTaskInfo({ taskID }: TaskInfoArgs | TaskInfoArgsSingleAgent, taskDB: TaskDB) {
  const returnAllTaskIDsInTree = taskDB.isSingleAgent && !taskID

  if (taskDB.isSingleAgent && !taskID) {
    taskID = taskDB.getCurrentInProgressTask()
    if (!taskID) {
      throw new Error('No task currently in progress.')
    }
  }

  const task = taskDB.get(taskID!)
  if (!task) {
    throw new Error(
      `Invalid task info request: Unknown task ID: ${taskID}.${
        taskDB.isSingleAgent
          ? ` Use 'task_info' tool without taskID to retrieve details on current 'in-progress' task.`
          : ''
      }`
    )
  }

  const res = {
    task: {
      ...task,

      // we don't want them to see this
      uncertaintyAreasUpdated: undefined,
    } satisfies Task,

    allTaskIDsInTree: returnAllTaskIDsInTree ? taskDB.getAllInTree(task.taskID).map((t) => t.taskID) : undefined,
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
