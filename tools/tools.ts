export type TextContent = {
  type: 'text'
  audience: Array<'user' | 'assistant'>
  text: string
}

export type ToolResult = {
  content: Array<TextContent>
  structuredContent: any
}

export type ToolHandler = (args: any) => Promise<ToolResult>
