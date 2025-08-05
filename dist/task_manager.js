import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { toolHandlers, tools } from './tools/index.js';
export function createServer() {
    const server = new Server({
        name: 'task-manager',
        title: 'Task Manager',
        version: '0.1.0',
    }, {
        capabilities: {
            tools: {},
        },
    });
    server.setRequestHandler(ListToolsRequestSchema, () => {
        return { tools };
    });
    server.setRequestHandler(CallToolRequestSchema, async ({ params: { name, arguments: args } }) => {
        const toolHandler = toolHandlers[name];
        if (!toolHandler) {
            throw new Error(`Unknown tool: ${name}`);
        }
        const parsedArgs = toolHandler.schema.parse(args);
        return await toolHandler.handler(parsedArgs);
    });
    return { server, cleanup: () => { } };
}
