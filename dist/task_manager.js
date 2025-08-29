import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { toolHandlers, tools } from './tools/index.js';
import { TaskDB } from './tools/task_db.js';
export function createServer() {
    const singleAgent = process.env.SINGLE_AGENT === 'true';
    if (singleAgent) {
        console.error('Running in single agent mode');
    }
    else {
        console.error('Running in multi-agent mode');
    }
    const server = new Server({
        name: 'task-manager',
        title: 'Task Manager',
        version: '0.10.0',
    }, {
        capabilities: {
            tools: {},
        },
        instructions: `Use this server to manage structured tasks. Tools:
- create_task: Create a new task.
- decompose_task: Decompose a complex task into smaller, more manageable subtasks.
All tasks with complexity higher than low must always be decomposed before execution.
- update_task: Change the status of a task.
Must use 'update_task' before executing a task, and when executing a task has finished.
- task_info: Get full details for specified task IDs.${singleAgent ? '\n- current_task: Get task infos for in-progress tasks.' : ''}`,
    });
    server.setRequestHandler(ListToolsRequestSchema, () => {
        return { tools: tools(singleAgent) };
    });
    const handlers = toolHandlers();
    const taskDB = new TaskDB();
    server.setRequestHandler(CallToolRequestSchema, async ({ params: { name, arguments: args } }) => {
        const toolHandler = handlers[name];
        if (!toolHandler) {
            throw new Error(`Unknown tool: ${name}`);
        }
        const parsedArgs = toolHandler.schema.parse(args);
        return await toolHandler.handler(parsedArgs, taskDB, singleAgent);
    });
    return { server, cleanup: () => { } };
}
