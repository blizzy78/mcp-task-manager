import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const IDSchema = z.string().min(1).brand('id')

export const TaskIDSchema = IDSchema.brand('task')
export type TaskID = z.infer<typeof TaskIDSchema>

export const TaskStatusSchema = z.enum(['not-started', 'in-progress', 'complete']).brand('task-status')
export type TaskStatus = z.infer<typeof TaskStatusSchema>

export const ParentTaskSchema = z.object({
  taskID: TaskIDSchema.describe('The identifier of the parent task.'),
  currentStatus: TaskStatusSchema.describe('The current status of the parent task.'),
})

export const DependentTaskSchema = z.object({
  taskID: TaskIDSchema.describe('The identifier of the dependent task.'),
  currentStatus: TaskStatusSchema.describe('The current status of the dependent task.'),
})

export const InitialUncertaintyAreaSchema = z.object({
  description: z.string().min(1).describe('A description of this uncertainty area.'),
})

export type InitialUncertaintyArea = z.infer<typeof InitialUncertaintyAreaSchema>

export const UncertaintyAreaStatusSchema = z.enum(['unresolved', 'resolved']).brand('uncertainty-area-status')
export type UncertaintyAreaStatus = z.infer<typeof UncertaintyAreaStatusSchema>

export const UncertaintyAreaIDSchema = IDSchema.brand('uncertainty-area')
export type UncertaintyAreaID = z.infer<typeof UncertaintyAreaIDSchema>

export const UpdatingUncertaintyAreaSchema = InitialUncertaintyAreaSchema.extend({
  uncertaintyAreaID: UncertaintyAreaIDSchema.optional().describe(
    'The identifier of this uncertainty area. Must be provided if updating an existing area.'
  ),
  status: UncertaintyAreaStatusSchema.optional().describe(
    'The research status of this uncertainty area. Must be provided if updating an existing area.'
  ),
  resolution: z
    .string()
    .min(1)
    .optional()
    .describe(
      `A detailed description of the outcome of the research for this uncertainty area.
Must be provided if updating an existing area to status 'resolved'.`
    ),
})

export type UpdatingUncertaintyArea = z.infer<typeof UpdatingUncertaintyAreaSchema>

const UncertaintyAreaSchema = InitialUncertaintyAreaSchema.extend({
  uncertaintyAreaID: UncertaintyAreaIDSchema,
  status: UncertaintyAreaStatusSchema,
  resolution: z.string().min(1).optional(),
})

export type UncertaintyArea = z.infer<typeof UncertaintyAreaSchema>

export type Task = {
  taskID: TaskID
  currentStatus: TaskStatus
  title: string
  description: string
  goal: string
  parentTaskID?: TaskID
  dependentTaskIDs: Array<TaskID>
  uncertaintyAreas: Array<UncertaintyArea>
}

export function newTaskID() {
  return TaskIDSchema.parse(randomUUID())
}

export function newUncertaintyAreaID() {
  return UncertaintyAreaIDSchema.parse(randomUUID())
}
