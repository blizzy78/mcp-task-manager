import type { TaskDB } from './task_db.js'

export type TextContent = {
  type: 'text'
  audience: Array<'user' | 'assistant'>
  text: string
}

export type ToolResult = {
  content: Array<TextContent>
  structuredContent: any
}

export type ToolHandler = (args: any, db: TaskDB, singleAgent: boolean) => Promise<ToolResult>
