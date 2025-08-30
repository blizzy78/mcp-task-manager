import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { type TaskDB } from '../task_db.js'
import { DoneStatus, FailedStatus, toBasicTaskInfo, TodoStatus } from '../tasks.js'

export const CurrentTaskArgsSchema = z.object({})

type CurrentTaskArgs = z.infer<typeof CurrentTaskArgsSchema>

export const CURRENT_TASK = 'current_task'

export const currentTaskTool = {
  name: CURRENT_TASK,
  title: 'Get current task',
  description: 'Returns a list of tasks that are currently in progress.',
  inputSchema: zodToJsonSchema(CurrentTaskArgsSchema),
}

export async function handleCurrentTask(_: CurrentTaskArgs, taskDB: TaskDB) {
  const currentTaskID = taskDB.getCurrentTask()
  if (!currentTaskID) {
    const res = { tasks: [] }

    return {
      content: [],
      structuredContent: res,
    } satisfies CallToolResult
  }

  const tasksInTree = taskDB.getAllInTree(currentTaskID)

  const res = {
    tasks: tasksInTree.map((t) =>
      toBasicTaskInfo(t, true, t.status !== DoneStatus && t.status !== FailedStatus, t.status === TodoStatus)
    ),
  }

  return {
    content: [
      {
        type: 'text',
        text: "Use 'task_info' to retrieve full task details",
        audience: ['assistant'],
      } satisfies TextContent,
    ],

    structuredContent: res,
  } satisfies CallToolResult
}
