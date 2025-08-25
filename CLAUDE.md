# Task Manager MCP Server

## What the Project is About

The Task Manager MCP Server is a TypeScript-based Model Context Protocol (MCP) server that provides task management capabilities for AI agents and automation systems. This project implements an MCP server that exposes tools for structured task orchestration: task creation, task decomposition, and task status management.

The primary purpose of this project is to enable AI agents and other MCP clients to:

- **Create and organize tasks** in hierarchical structures with dependencies
- **Decompose complex tasks** into smaller, more manageable subtasks with sequence ordering
- **Track task progression** through defined states (todo, in-progress, done, failed)
- **Orchestrate workflows** with proper dependency validation and critical path tracking

The server maintains tasks in memory during execution and provides transport modes (STDIO, SSE, HTTP) for different integration scenarios.

## MCP Specification Compliance

This server adheres to the Model Context Protocol (MCP) specification dated 2025-06-18. For full details, see the official specification:

- MCP Specification (2025-06-18): https://modelcontextprotocol.io/specification/2025-06-18

## High Level View of the Architecture

The Task Manager MCP Server follows a straightforward architecture built on the Model Context Protocol (MCP) SDK:

### Core Components

#### 1. Server Infrastructure
- **Entry Point** (`index.ts`): Routes between different transport modes based on command-line arguments
- **Server Factory** (`task_manager.ts`): Creates and configures the MCP server with tool handlers
- **Transport Modes**:
  - **STDIO Mode** (`stdio.ts`): Standard input/output communication (default)
  - **SSE Mode** (`sse.ts`): Server-Sent Events with Express.js for web integration
  - **HTTP Mode** (`streamableHttp.ts`): HTTP-based communication

#### 2. Task Management Tools
Discrete MCP tools provide the core functionality:

- **`create_task`**: Creates new tasks with optional dependencies and uncertainty areas
- **`decompose_task`**: Decomposes complex tasks into smaller, more manageable subtasks with sequence ordering
- **`update_task`**: Manages task lifecycle states with validation rules (todo, in-progress, done, failed)
- **`task_info`**: Returns full details for requested tasks
- **`current_task`**: Returns a list of tasks that are currently in progress (single agent mode only)

#### 3. Data Layer
- **TaskDB** (`task_db.ts`): Simple in-memory storage using Map for task persistence during server runtime
- **Type System**: Zod schemas for validation and TypeScript types for type safety
- **Task IDs**: Generated using nanoid for unique identification

### Key Technologies

- **TypeScript**: Full type safety and modern JavaScript features
- **MCP SDK**: Model Context Protocol implementation
- **Zod**: Schema validation and JSON Schema generation
- **Express.js**: Web server for SSE and HTTP modes
- **Vitest**: Testing framework with coverage reporting

## High Level View of the Testing Procedures

The project uses **Vitest** as the testing framework with comprehensive unit tests for all tool implementations:

### Testing Infrastructure
- **Vitest Configuration**: Node.js environment with TypeScript support and V8 coverage provider
- **Test Organization**: Each tool has dedicated test files (`*.test.ts`)
- **Coverage Reporting**: Text-based coverage with exclusions for configuration and build files

### Testing Strategy
- **Tool-Focused Testing**: Each of the five tools has comprehensive test coverage
- **Schema Validation**: Tests verify input validation and output structure compliance
- **Scenario Coverage**: Tests include simple tasks, complex hierarchies, dependencies, and error conditions
- **Business Rule Validation**: Tests ensure proper task lifecycle management and constraint enforcement

### Test Execution
```bash
pnpm test           # Run all tests
pnpm test:coverage  # Run with coverage reporting
```

The testing approach ensures all tool functionality is validated, error conditions are handled properly, and MCP protocol compliance is maintained.

## Task Management Rules

- **Task Creation**: All tasks start with "todo" status
- **Task Decomposition**: Complex tasks can be broken into subtasks with sequence ordering for parallel execution
- **Dependency Validation**: Tasks can only transition to "done" if all critical path dependencies are complete
- **Status Transitions**: Tasks can move between todo, in-progress, done, and failed states
- **Task Identification**: Task IDs are generated using nanoid

## Installation and Usage

### Development
- **Package Manager**: pnpm
- **Build**: `pnpm build` - Compiles TypeScript and makes executable
- **Testing**: `pnpm test` - Runs Vitest test suite
- **Coverage**: `pnpm test:coverage` - Runs tests with coverage reporting

### Running the Server
```bash
# Via pnpm scripts (recommended)
pnpm start                # STDIO mode (default)
pnpm start:sse            # SSE mode for web integration
pnpm start:streamableHttp # HTTP mode

# Or directly with node
node dist/index.js                # STDIO mode (default)
node dist/index.js sse            # SSE mode
node dist/index.js streamableHttp # HTTP mode
```

### Integration
The server implements the Model Context Protocol specification and provides tools (`create_task`, `decompose_task`, `update_task`, `task_info`, and `current_task` in single agent mode) that can be used by any MCP-compatible client. Tasks are stored in memory during server runtime and support hierarchical organization with dependency management.
