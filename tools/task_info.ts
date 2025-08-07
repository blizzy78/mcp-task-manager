import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { TaskDB } from './task_db.js'
import { TaskIDSchema } from './tasks.js'
import type { TextContent, ToolResult } from './tools.js'

export const TaskInfoArgsSchema = z.object({
  taskID: TaskIDSchema.describe('The identifier of this task.'),
})

type TaskInfoArgs = z.infer<typeof TaskInfoArgsSchema>

export const TASK_INFO = 'task_info'

export const taskInfoTool = {
  name: TASK_INFO,
  title: 'Get task info',
  description: 'A tool to retrieve full information about a task.',
  inputSchema: zodToJsonSchema(TaskInfoArgsSchema),
}

export async function handleTaskInfo({ taskID }: TaskInfoArgs, taskDB: TaskDB) {
  const task = taskDB.get(taskID)
  if (!task) {
    throw new Error(`Invalid task info request: Unknown task ID: ${taskID}`)
  }

  const res = { task }

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
