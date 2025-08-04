# Task Manager MCP Server

## What the Project is About

The Task Manager MCP Server is a TypeScript-based Model Context Protocol (MCP) server that provides sophisticated task management capabilities for AI agents and automation systems. This project implements an MCP server that exposes three core tools for structured task orchestration: task registration, task assessment, and task status management.

The primary purpose of this project is to enable AI agents and other MCP clients to:

- **Register and organize tasks** in hierarchical structures with dependencies
- **Assess task complexity** and automatically break down complex tasks into manageable subtasks
- **Track task progression** through defined states (not-started, in-progress, complete)
- **Manage knowledge requirements** by identifying and tracking missing information needed for task completion
- **Orchestrate workflows** with proper dependency management and parent-child task relationships

The project is designed to be consumed by AI agents that need structured task management capabilities, making it easier to handle complex, multi-step workflows in an organized and trackable manner.

## High Level View of the Architecture

### Core Architecture Pattern

The Task Manager MCP Server follows a **plugin-based tool architecture** built on the Model Context Protocol (MCP) SDK. The architecture is designed around three main components:

#### 1. Server Infrastructure Layer
- **Entry Point Dispatcher** (`index.ts`): Routes between different server modes based on command-line arguments
- **Server Factory** (`task_manager.ts`): Creates and configures the MCP server with tool handlers
- **Multiple Transport Modes**:
  - **STDIO Mode** (`stdio.ts`): Standard input/output communication (default)
  - **SSE Mode** (`sse.ts`): Server-Sent Events with Express.js for web-based clients
  - **Streamable HTTP Mode** (`streamableHttp.ts`): HTTP-based communication

#### 2. Tool Layer Architecture
The core functionality is implemented as three discrete MCP tools in the `tools/` directory:

- **`register_task`**: Creates new tasks with optional parent-child relationships and dependencies
- **`assess_task`**: Analyzes task complexity and generates subtasks with knowledge requirements
- **`task_status`**: Manages task lifecycle states with dependency validation

Each tool follows a consistent pattern:
- **Schema Definition**: Zod schemas for input validation and JSON Schema generation
- **Handler Implementation**: Async functions that process tool requests
- **Result Formatting**: Standardized responses with both text and structured content

#### 3. Type System and Validation
- **Zod-based Schema Validation**: All tool inputs are validated using Zod schemas
- **JSON Schema Generation**: Automatic OpenAPI-compatible schema generation for MCP clients
- **Type Safety**: Full TypeScript type inference from Zod schemas
- **Shared Type Definitions**: Common types and schemas in `tools/tasks.ts`

### Key Architectural Patterns

1. **Command Pattern**: Each tool is implemented as a discrete command with its own handler
2. **Factory Pattern**: Server creation is abstracted through the `createServer()` factory function
3. **Strategy Pattern**: Multiple transport strategies (STDIO, SSE, HTTP) for different deployment scenarios
4. **Schema-First Design**: All APIs are defined through Zod schemas with automatic validation

### Data Flow Architecture

```
MCP Client Request → Transport Layer → MCP Server → Tool Router → Tool Handler → Validation → Business Logic → Response
```

The architecture ensures that:
- All requests are validated against schemas before processing
- Tool handlers are decoupled and independently testable
- Responses follow consistent formatting patterns
- Error handling is centralized and standardized

### Deployment Flexibility

The multi-transport architecture allows the same business logic to be deployed in different environments:
- **STDIO**: For direct process communication and CLI integration
- **SSE**: For web applications requiring real-time updates
- **HTTP**: For standard REST-like integrations

## High Level View of the Testing Procedures

### Testing Framework and Configuration

The project uses **Vitest** as the primary testing framework, configured for comprehensive unit testing of all tool implementations. The testing setup includes:

#### Testing Infrastructure
- **Vitest Configuration** (`vitest.config.ts`): Node.js environment with TypeScript support
- **Coverage Reporting**: V8 provider with text output, excluding test files and configuration
- **Global Test Setup** (`vitest.setup.ts`): Minimal setup file for future test configuration
- **Test Discovery**: Automatic detection of `*.test.ts` and `*.spec.ts` files

#### Testing Strategy

The testing approach follows a **comprehensive unit testing strategy** with the following characteristics:

1. **Tool-Centric Testing**: Each tool has its own dedicated test suite
   - `register_task.test.ts`: Tests task registration scenarios
   - `assess_task.test.ts`: Tests task complexity assessment
   - `task_status.test.ts`: Tests task lifecycle management

2. **Schema Validation Testing**: All test suites validate both input schemas and output structures
   - Input parameter validation
   - Output format compliance
   - Error condition handling

3. **Scenario-Based Testing**: Tests cover multiple complexity levels:
   - **Simple Scenarios**: Basic task operations without dependencies
   - **Complex Scenarios**: Hierarchical tasks with parent-child relationships
   - **Dependency Scenarios**: Tasks with prerequisite dependencies
   - **Edge Cases**: Error conditions and validation failures

#### Test Coverage Areas

1. **Functional Testing**:
   - Tool handler logic verification
   - Schema validation accuracy
   - Response structure compliance
   - Business rule enforcement

2. **Integration Testing**:
   - Tool interaction patterns
   - Dependency resolution logic
   - Task hierarchy management
   - Status transition validation

3. **Error Handling Testing**:
   - Invalid input handling
   - State transition violations
   - Dependency constraint violations
   - Schema validation failures

#### Testing Procedures

1. **Development Testing**:
   ```bash
   pnpm test           # Run all tests
   pnpm test:coverage  # Run with coverage reporting
   ```

2. **Test Organization**:
   - Each tool has comprehensive test coverage
   - Tests are organized by feature and complexity
   - Clear test descriptions and assertions
   - Consistent test data patterns

3. **Quality Assurance**:
   - High test coverage requirements
   - Validation of both success and failure paths
   - Performance considerations for tool handlers
   - Maintainable test structure for future extensions

The testing procedures ensure that all tool functionality is thoroughly validated, error conditions are properly handled, and the MCP protocol compliance is maintained across all features.
