# Task Manager MCP Server

This MCP server allows agents to orchestrate task workflows through exploration. It provides structured task management capabilities for agents working on complex multi-step problems:

- **Create and organize tasks** in hierarchical structures with dependencies
- **Decompose complex tasks** into smaller, more manageable subtasks with sequence ordering
- **Track task progression** through defined states (todo, in-progress, done, failed)
- **Orchestrate workflows** with proper dependency validation and critical path tracking

The tools have been tested extensively and successfully with GitHub Copilot in VS Code, and Claude Sonnet 4. (GPT-4.1 and GPT-5 do not seem to work very well unfortunately.)

Note: When using this MCP server, you should disable the Todo List tool in VS Code.


## Tools

1. `create_task`
   - Creates a new task that must be executed. If decomposing a complex task is required, must use 'decompose_task' first before executing it. All tasks start in the todo status. Must use 'update_task' before executing this task, and when executing this task has finished.
   - Inputs:
     - `title` (string): A concise title for this task. Must be understandable out of context
     - `description` (string): A detailed description of this task. Must be understandable out of context
     - `goal` (string): The overall goal of this task. Must be understandable out of context
     - `definitionsOfDone` (array of strings): A detailed list of criteria that must be met for this task to be considered 'complete'. Must be understandable out of context
     - `criticalPath` (boolean): Whether this task is on the critical path and required for completion
     - `estimatedComplexity` (object): An estimate of the complexity of this task, containing:
       - `level` (enum): One of "trivial", "low, may benefit from decomposition before execution", "average, must decompose before execution", "medium, must decompose before execution", "high, must decompose before execution"
       - `description` (string): A description of the complexity of this task
     - `uncertaintyAreas` (array of objects): A detailed list of areas where there is uncertainty about this task's requirements or execution, each containing:
       - `title` (string): A concise title for this uncertainty area
       - `description` (string): A description of this uncertainty area
   - Behavior:
     - All tasks start in the todo status
     - Must use 'update_task' before executing this task, and when executing this task has finished
     - If decomposing a complex task is required, must use 'decompose_task' first before executing it
   - Returns: Confirmation including the created task

2. `decompose_task`
   - Decomposes an existing complex task into smaller, more manageable subtasks. All tasks with complexity higher than low must always be decomposed before execution. Subtasks with the same sequence order may be executed in parallel. Subtasks should include a verification subtask.
   - Inputs:
     - `taskID` (string): The task to decompose
     - `decompositionReason` (string): The reason for decomposing this task
     - `subtasks` (array of objects): Array of smaller, manageable subtasks to create, each containing:
       - `title` (string): A concise title for this subtask. Must be understandable out of context
       - `description` (string): A detailed description of this subtask. Must be understandable out of context
       - `goal` (string): The overall goal of this subtask. Must be understandable out of context
       - `definitionsOfDone` (array of strings): A detailed list of criteria that must be met for this subtask to be considered 'complete'. Must be understandable out of context
       - `criticalPath` (boolean): Whether this subtask is on the critical path and required for completion of this task
       - `uncertaintyAreas` (array of objects): Areas where there is uncertainty about this subtask's requirements or execution, each containing:
         - `title` (string): A concise title for this uncertainty area
         - `description` (string): A description of this uncertainty area
       - `sequenceOrder` (number): The sequence order of this subtask. Subtasks with the same order may be executed in parallel
   - Behavior:
     - All tasks with complexity higher than low must always be decomposed before executing
     - Subtasks with the same sequence order may be executed in parallel
     - Creates dependency chains based on sequence order (later sequences depend on earlier ones)
     - Subtasks should include a verification subtask
   - Returns: Confirmation including the created subtasks and updated parent task

3. `update_task`
   - Updates the status and/or other properties of a task
   - Inputs:
     - `tasks` (array of objects): The tasks to update, each containing:
       - `taskID` (string): The identifier of the task to change status
       - `set` (object, optional): Optional properties to update on this task, containing:
         - `status` (enum, optional): The new status ("todo", "in-progress", "done", or "failed")
         - `title` (string, optional): A concise title for this task. Must be understandable out of context
         - `description` (string, optional): A detailed description of this task. Must be understandable out of context
         - `goal` (string, optional): The overall goal of this task. Must be understandable out of context
         - `criticalPath` (boolean, optional): Whether this task is on the critical path and required for completion
         - `estimatedComplexity` (object, optional): An estimate of the complexity of this task
       - `add` (object, optional): Optional properties to add to this task, containing:
         - `dependsOnTaskIDs` (array of strings, optional): New tasks that this task depends on
         - `definitionsOfDone` (array of strings, optional): Additional criteria that must be met for this task to be considered 'complete'
         - `uncertaintyAreas` (array of objects, optional): Additional areas where there is uncertainty about this task's requirements or execution
         - `lessonsLearned` (array of strings, optional): Lessons learned while executing this task that may inform future tasks
         - `verificationEvidence` (array of strings, optional): Verification evidence that this task was executed as planned, and that the definitions of done were met
       - `remove` (object, optional): Optional properties to remove from this task, containing:
         - `dependsOnTaskIDs` (array of strings, optional): Tasks that this task no longer depends on
   - Behavior:
     - Must use this tool before executing a task, and when executing a task has finished
     - Can be used to set the status of multiple tasks at once if their dependencies allow it
     - Should always include lessons learned to inform future tasks, if possible
     - Tasks can only transition to "done" if all critical path dependencies are completed
     - Validates status transitions and dependencies before allowing changes
     - Cannot transition from "done" to "failed" or vice versa
   - Returns: Status transition confirmation including the updated tasks

4. `task_info`
   - Returns full details for requested tasks
   - Inputs:
     - `taskIDs` (array of strings): A list of task IDs to retrieve information for
   - Behavior:
     - Returns full task details including all properties (status, dependencies, descriptions, etc.)
     - Handles missing task IDs gracefully by returning them in a separate list
   - Returns: Object containing arrays of found tasks and any not found task IDs

5. `current_task` *(single agent mode only)*
   - Returns a list of tasks that are currently in progress.
   - Inputs: None
   - Behavior:
     - Only available when single agent mode is enabled (`SINGLE_AGENT=true`)
     - Filters tasks to return only those currently in progress
     - Useful for agents to recover task context after conversation history compacting
   - Returns: Object containing array of current tasks


## Single Agent Mode

The task manager supports a special "single agent mode" that can be enabled by setting the environment variable `SINGLE_AGENT=true`. In this mode, the server will provide the additional `current_task` tool.

This is useful for long-running agents where the agent loop is compacting/summarizing the agent's conversation history to prevent exceeding the context window limit. In these cases, the agent may "forget" which tasks exist because the task IDs have been removed from the context window. Single agent mode allows the agent to use the `current_task` tool, enabling it to recover information about the current task tree.

**Do not enable single agent mode if you plan to use this MCP server with multiple agents at the same time. If enabled, only one agent should use the MCP server at any one time.**


### Enabling Single Agent Mode

Set the environment variable before starting the server:

```bash
SINGLE_AGENT=true npx @blizzy/mcp-task-manager
```

Or in Claude Desktop configuration:

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["-y", "@blizzy/mcp-task-manager"],
      "env": {
        "SINGLE_AGENT": "true"
      }
    }
  }
}
```


## Recommended Agent Prompt Snippets

**Instructions section**

```
# Agent Instructions

For any user request, DO THIS FIRST: Use the Task Management tools to create a new task for the user's request. Always add these uncertainty areas as the first ones to the task:
1. Project overview as documented in README.md and CLAUDE.md
2. Project configuration, such as test commands

Resolve the user's request completely by executing all incomplete tasks. Doing so may include:

- Gathering information or doing research
- Writing or editing code or other content
- Fixing problems
- etc.

Use all tools available to you to help you in executing tasks, as appropriate. This includes:

- Use the Task Management Tools to manage your tasks. Always use these tools to manage your tasks.
- Use the Reasoning Tools to gather information and do research, work structured and logically, and stay on track. It is very important to use these tools often to execute tasks effectively.
- Use the Web Access Tools to gather information and do research. Use these tools as needed.

Always follow the Agent Rules, especially when writing or editing code or other content.

Keep executing tasks until all tasks are complete. The user's request is considered resolved once all tasks are complete.
```


**Task Management tools section**

```
# Task Management Tools

You must use the following tools to manage and organize your tasks. This is essential for effective task tracking, prioritization, and ensuring that all steps are completed in the correct order. Using these tools will help you maintain clear oversight of your work and dependencies throughout the process.

'create_task' allows you to create a new task that needs to be executed. If decomposing a complex task is required, you must use 'decompose_task' to break it down into smaller, more manageable subtasks.

Pay attention that tasks can depend on each other. You may need to execute them in a specific order. Always check the dependencies of a task before executing it, and complete the dependencies first.
```


## Usage with Claude Desktop (uses [stdio Transport](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#stdio))

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": [
        "-y",
        "@blizzy/mcp-task-manager"
      ]
    }
  }
}
```


## Usage with VS Code

For quick installation, use of of the one-click install buttons below.

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-NPM-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=task-manager&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40blizzy%2Fmcp-task-manager%22%5D%7D) [![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-NPM-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=task-manager&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40blizzy%2Fmcp-task-manager%22%5D%7D&quality=insiders)

[![Install with Docker in VS Code](https://img.shields.io/badge/VS_Code-Docker-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=task-manager&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22-i%22%2C%22--rm%22%2C%22mcp%2Ftask-manager%22%5D%7D) [![Install with Docker in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Docker-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=task-manager&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22-i%22%2C%22--rm%22%2C%22mcp%2Ftask-manager%22%5D%7D&quality=insiders)

For manual installation, add the following JSON block to your User Settings (JSON) file in VS Code. You can do this by pressing `Ctrl + Shift + P` and typing `Preferences: Open User Settings (JSON)`.

Optionally, you can add it to a file called `.vscode/mcp.json` in your workspace. This will allow you to share the configuration with others.

> Note that the `mcp` key is not needed in the `.vscode/mcp.json` file.


#### NPX

```json
{
  "mcp": {
    "servers": {
      "task-manager": {
        "command": "npx",
        "args": ["-y", "@blizzy/mcp-task-manager"]
      }
    }
  }
}
```


## Running from source with [HTTP+SSE Transport](https://modelcontextprotocol.io/specification/2024-11-05/basic/transports#http-with-sse) (deprecated as of [2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports))

```shell
pnpm install
pnpm run start:sse
```


## Run from source with [Streamable HTTP Transport](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http)

```shell
pnpm install
pnpm run start:streamableHttp
```


## Running as an installed package

### Install

```shell
npm install -g @blizzy/mcp-task-manager@latest
````


### Run the default (stdio) server

```shell
npx @blizzy/mcp-task-manager
```


### Or specify stdio explicitly

```shell
npx @blizzy/mcp-task-manager stdio
```


### Run the SSE server

```shell
npx @blizzy/mcp-task-manager sse
```


### Run the streamable HTTP server

```shell
npx @blizzy/mcp-task-manager streamableHttp
```


## License

This package is licensed under the MIT license.
