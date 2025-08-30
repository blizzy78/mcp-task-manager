import type { ReadResourceResult, TextResourceContents } from '@modelcontextprotocol/sdk/types.js'
import type { TaskDB } from './task_db.js'
import { TaskIDSchema } from './tasks.js'

export async function handleReadResource(uri: string, taskDB: TaskDB): Promise<ReadResourceResult> {
  if (!uri.startsWith('task://')) {
    throw new Error(`Invalid URI: ${uri}`)
  }

  const taskID = TaskIDSchema.parse(uri.substring(7))

  const task = taskDB.get(taskID)
  if (!task) {
    throw new Error(`Task not found: ${taskID}`)
  }

  return {
    contents: [
      {
        uri,
        name: task.taskID,
        title: task.title,
        description: task.description,
        mimeType: 'application/json',
        text: JSON.stringify(task),
        annotations: {
          audience: ['assistant'],
        },
      } satisfies TextResourceContents,
    ],
  } satisfies ReadResourceResult
}
