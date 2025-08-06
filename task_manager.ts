import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { toolHandlers, tools } from './tools/index.js'
import { TaskDB } from './tools/task_db.js'

export function createServer() {
  const server = new Server(
    {
      name: 'task-manager',
      title: 'Task Manager',
      version: '0.3.0',
    },

    {
      capabilities: {
        tools: {},
      },
    }
  )

  server.setRequestHandler(ListToolsRequestSchema, () => {
    return { tools }
  })

  const taskDB = new TaskDB()

  server.setRequestHandler(CallToolRequestSchema, async ({ params: { name, arguments: args } }) => {
    const toolHandler = toolHandlers[name as keyof typeof toolHandlers]
    if (!toolHandler) {
      throw new Error(`Unknown tool: ${name}`)
    }

    const parsedArgs = toolHandler.schema.parse(args)
    return await toolHandler.handler(parsedArgs, taskDB)
  })

  return { server, cleanup: () => {} }
}
