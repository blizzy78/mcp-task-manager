import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { TaskDB } from '../task_db.js'

export type ToolHandler = (args: any, db: TaskDB, singleAgent: boolean) => Promise<CallToolResult>
