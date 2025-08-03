import { createHash } from 'node:crypto'
import { z } from 'zod'

export const IDSchema = z.string().min(1)

export const TaskStatusSchema = z.enum(['not-started', 'in-progress', 'complete'])

export function assessmentId(taskId: string) {
  return `assessment-${createHash('md5').update(taskId).digest('hex')}`
}
