import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { toolHandlers, tools } from './tools/index.js';
import { TaskDB } from './tools/task_db.js';
export function createServer() {
    const singleAgent = process.env.SINGLE_AGENT === 'true';
    console.error(singleAgent ? 'Running in single agent mode' : 'Running in multi-agent mode');
    const server = new Server({
        name: 'task-manager',
        title: 'Task Manager',
        version: '0.8.0',
    }, {
        capabilities: {
            tools: {},
        },
        instructions: 'Use this server to manage structured tasks. Tools:\n' +
            '- create_task: Create new task with optional dependencies and uncertainty areas.\n' +
            '- update_task: Update dependencies and uncertainty areas.\n' +
            '- transition_task_status: Change status (not-started -> in-progress -> complete). ' +
            "Before 'in-progress', all dependencies must be 'complete'. " +
            'When completing, provide outcomeDetails and verificationEvidence.\n' +
            '- task_info: Retrieve full task details.',
    });
    server.setRequestHandler(ListToolsRequestSchema, () => {
        return { tools: tools(singleAgent) };
    });
    const handlers = toolHandlers(singleAgent);
    const taskDB = new TaskDB(singleAgent);
    server.setRequestHandler(CallToolRequestSchema, async ({ params: { name, arguments: args } }) => {
        const toolHandler = handlers[name];
        if (!toolHandler) {
            throw new Error(`Unknown tool: ${name}`);
        }
        const parsedArgs = toolHandler.schema.parse(args);
        return await toolHandler.handler(parsedArgs, taskDB);
    });
    return { server, cleanup: () => { } };
}
