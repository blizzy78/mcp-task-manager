# Task Manager MCP Server

This MCP server allows agents to manage tasks, including creating tasks with uncertainty areas, updating task dependencies and uncertainty resolution, and transitioning task status through their lifecycle. It provides structured task management capabilities for agents working on complex multi-step problems:

- **Create and organize tasks** in hierarchical structures with dependencies
- **Update tasks** with dependency information and uncertainty area tracking
- **Track task progression** through defined states (not-started, in-progress, complete)
- **Manage uncertainty areas** by identifying and tracking areas that need resolution before task execution
- **Orchestrate workflows** with proper dependency validation and parent-child task relationships

## Tools

1. `create_task`
   - A tool to create a new task
   - Inputs:
     - `title` (string): A concise title for this task
     - `description` (string): A detailed description of this task
     - `goal` (string): The overall goal of this task
     - `dependsOnTaskIDs` (array of strings): Task IDs this task depends on; referenced tasks must already exist
     - `uncertaintyAreas` (array of objects): Areas requiring clarification, each containing:
       - `title` (string): A concise title for this uncertainty area
       - `description` (string): A description of this uncertainty area
   - Behavior:
     - Creates one separate task per uncertainty area (status `not-started`), and links those tasks as dependencies of the newly created main task
     - Any provided `dependsOnTaskIDs` are also applied as dependencies of each uncertainty-area task
   - Returns: Confirmation including a list of `tasksCreated` (uncertainty-area tasks first, then the main task)

2. `update_task`
   - A tool to update an existing task
   - Inputs:
     - `taskID` (string): The identifier of the task to update
     - `newDependsOnTaskIDs` (array of strings): Additional dependency task IDs to apply to newly created uncertainty tasks
     - `newUncertaintyAreas` (array of objects): New areas requiring clarification to add as separate tasks, each containing:
       - `title` (string)
       - `description` (string)
   - Behavior:
     - Creates a separate task for each `newUncertaintyArea` (status `not-started`), applies `newDependsOnTaskIDs` to those tasks, and adds these newly created tasks as dependencies of the target `taskID`
     - If the target task is already `complete`, the operation fails
     - This operation does not update existing uncertainty-area tasks or their statuses
   - Returns: Confirmation including `taskUpdated` and, if any were created, `tasksCreated`

3. `transition_task_status`
   - A tool to transition the status of a task
   - Inputs:
     - `taskID` (string): The identifier of this task
     - `newStatus` (enum): The new status ("not-started", "in-progress", or "complete")
     - `outcomeDetails` (string, optional): Required when transitioning to "complete"
   - Behavior:
     - Allowed transitions:
       - `not-started` → `in-progress`
       - `in-progress` → `complete` (requires `outcomeDetails`)
       - `complete` → `in-progress`
     - To start (`in-progress`), all dependencies of the task must be `complete`
   - Returns: Status transition confirmation including `taskUpdated`

4. `task_info`
   - A tool to retrieve full information about a task
   - Inputs:
     - `taskID` (string): The identifier of this task
   - Returns: The stored task object `{ taskID, currentStatus, title, description, goal, dependsOnTaskIDs }`


## Recommended Agent Prompt Snippet

```
# Task Management Tools

You must use the following tools to manage and organize your tasks. This is essential for effective task tracking, prioritization, and ensuring that all steps are completed in the correct order. Using these tools will help you maintain clear oversight of your work and dependencies throughout the process.

- Use the 'create_task' tool to create any new tasks that need to be performed later.
- Use the 'update_task' tool to update a task, such as adding new dependencies or uncertainty areas.
- Use the 'transition_task_status' tool to transition the status of a task. IMPORTANT: You must always use this tool before you begin working on a task, and after you've completed a task.

IMPORTANT: Always use the 'transition_task_status' tool to transition the status of a task before you begin working on it, and after you've completed the task. This is essential for effective task tracking and ensuring that all steps are completed in the correct order.

Pay attention that tasks can depend on each other. You may need to perform them in a specific order. Always check the dependencies of a task before performing it, and complete the dependencies first.
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
