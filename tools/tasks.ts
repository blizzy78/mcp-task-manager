import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const IDSchema = z.string().min(1).brand('id')

export const TaskIDSchema = IDSchema.brand('task')
export type TaskID = z.infer<typeof TaskIDSchema>

export const TaskStatusSchema = z.enum(['not-started', 'in-progress', 'complete']).brand('task-status')
export type TaskStatus = z.infer<typeof TaskStatusSchema>

export function newTaskID() {
  return TaskIDSchema.parse(randomUUID())
}
