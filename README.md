# Task Manager MCP Server

This MCP server allows agents to manage tasks, including registering tasks, assessing their complexity, breaking down into subtasks, and updating their status. It provides structured task management capabilities for agents working on complex multi-step problems.


## Tools

1. `register_task`
   - A tool to register a new task that must be performed
   - Inputs:
     - `taskId` (string): The unique identifier for this task
     - `title` (string): A concise title for this task
     - `description` (string): A detailed description of this task
     - `goal` (string): The overall goal of this task
     - `parentTaskId` (string, optional): The identifier of the parent task this task belongs to, if applicable. Must be provided if this task is a subtask of another task
     - `dependsOnCompletedTaskIds` (array of strings, optional): A list of task identifiers this task depends on. Must be provided if this task can't be started before all of the dependent tasks are complete
   - Returns: Task registration confirmation with task ID, current status ("not-started"), parent task ID, dependencies, and assessment requirement

2. `assess_task`
   - A tool to assess the complexity and structure of a task (can only be assessed if it hasn't been started yet)
   - Inputs:
     - `taskId` (string): The unique identifier for this task
     - `parentTaskId` (string, optional): The identifier of the parent task this task belongs to, if applicable
     - `currentStatus` (enum): The current status of the task (must be "not-started")
     - `complexityAssessment` (string): A detailed assessment of this task's complexity, describing if it can be performed all at once or requires multiple discrete subtasks
     - `complexityAssessmentOutcomeSubtasks` (array of objects, optional): A list of discrete subtasks that must be performed to complete this task, each containing:
       - `taskId` (string): A unique identifier for this subtask
       - `title` (string): A concise title for this subtask
       - `description` (string): A detailed description of this subtask
       - `goal` (string): The overall goal of this subtask
       - `missingKnowledge` (array of objects, optional): A list of specific knowledge or information that is missing and must be researched, each containing:
         - `knowledgeId` (string): The unique identifier for this knowledge
         - `title` (string): A concise title for this knowledge
         - `description` (string): A detailed description of this knowledge
   - Returns: Assessment confirmation with assessment ID, task ID, parent task ID, and list of tasks that need registration (including knowledge acquisition tasks)

3. `task_status`
   - A tool to update the status of a task (must be used when beginning and completing tasks)
   - Inputs:
     - `taskId` (string): The unique identifier of this task
     - `assessmentId` (string): The unique identifier of the complexity and structure assessment for this task (must be acquired using 'assess_task' before starting)
     - `currentStatus` (enum): The current status - "not-started", "in-progress", or "complete"
     - `parentTask` (object, optional): Details about the parent task, containing:
       - `taskId` (string): The unique identifier of the parent task
       - `currentStatus` (enum): The current status of the parent task
     - `dependsOnTasks` (array of objects, optional): A list of tasks this task depends on, each containing:
       - `taskId` (string): The unique identifier of the dependent task
       - `currentStatus` (enum): The current status of the dependent task
     - `outcomeDetails` (string, optional): Details about the outcome of this task (required if status is complete)
     - `recommendedNextTaskId` (string, optional): The identifier of the next recommended task to perform after this one (only allowed if status is complete)
   - Returns: Status update confirmation with current task state including all provided parameters


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
