import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { handleReadResource } from './resources.js'
import { TaskDB } from './task_db.js'
import { toolHandlers, tools } from './tools/index.js'

const serverInfo = {
  name: 'task-manager',
  title: 'Task Manager',
  version: '0.11.1',
}

export function createServer() {
  const singleAgent = process.env.SINGLE_AGENT === 'true'

  if (singleAgent) {
    console.error('Running in single agent mode')
  } else {
    console.error('Running in multi-agent mode')
  }

  const taskDB = new TaskDB()

  const server = new Server(
    serverInfo,

    {
      capabilities: {
        tools: {},
        resources: {},
      },

      instructions: `Use this server to manage structured tasks.

Tools:
- create_task: Create a new task.
- decompose_task: Decompose a complex task into smaller, more manageable subtasks.
All tasks with complexity higher than low must always be decomposed before execution.
- update_task: Change the status of a task.
Must use 'update_task' before executing a task, and when executing a task has finished.
- task_info: Get full details for specified task IDs.${
        singleAgent ? '\n- current_task: Get task infos for in-progress tasks.' : ''
      }

Resources:
Tasks can be accessed as resources using the task:// URI scheme:
- Read individual task: task://taskID`,
    }
  )

  const theTools = tools(singleAgent)

  server.setRequestHandler(ListToolsRequestSchema, () => {
    return { tools: theTools }
  })

  const handlers = toolHandlers()

  server.setRequestHandler(CallToolRequestSchema, async ({ params: { name, arguments: args } }) => {
    const toolHandler = handlers[name as keyof typeof handlers]
    if (!toolHandler) {
      throw new Error(`Unknown tool: ${name}`)
    }

    const parsedArgs = toolHandler.schema.parse(args)
    return await toolHandler.handler(parsedArgs, taskDB, singleAgent)
  })

  server.setRequestHandler(ReadResourceRequestSchema, async ({ params: { uri } }) => {
    return await handleReadResource(uri, taskDB)
  })

  return { server, cleanup: () => {} }
}
