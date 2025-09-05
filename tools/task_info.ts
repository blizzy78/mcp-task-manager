import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { type TaskDB } from '../task_db.js'
import { TaskIDSchema, type Task, type TaskID } from '../tasks.js'

export const TaskInfoArgsSchema = z.object({
  taskIDs: TaskIDSchema.array().min(1).describe('A list of task IDs to retrieve information for'),
})

type TaskInfoArgs = z.infer<typeof TaskInfoArgsSchema>

export const TASK_INFO = 'task_info'

export const taskInfoTool = {
  name: TASK_INFO,
  title: 'Get task info',
  description: 'Returns full details for requested tasks',
  inputSchema: zodToJsonSchema(TaskInfoArgsSchema, { $refStrategy: 'none' }),
}

export async function handleTaskInfo({ taskIDs }: TaskInfoArgs, taskDB: TaskDB, singleAgent: boolean) {
  const tasks = new Array<Task>()
  const notFoundTaskIDs = new Array<TaskID>()

  for (const taskID of taskIDs) {
    const task = taskDB.get(taskID)
    if (!task) {
      notFoundTaskIDs.push(taskID)
      continue
    }

    tasks.push(task)
  }

  const incompleteTaskIDs =
    notFoundTaskIDs.length === 0 ? taskDB.incompleteTasksInTree(taskIDs[0]).map((t) => t.taskID) : undefined

  const res = {
    tasks,
    notFoundTasks: notFoundTaskIDs,
    incompleteTasksIdealOrder: singleAgent ? incompleteTaskIDs : undefined,
  }

  return {
    content: [],
    structuredContent: res,
  } satisfies CallToolResult
}
