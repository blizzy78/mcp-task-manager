import { z } from 'zod'
import { type Task } from './task_db.js'
import { newTaskID, TaskStatusSchema, type TaskID } from './tasks.js'

export const UncertaintyAreaSchema = z.object({
  title: z.string().min(1).describe('A concise title for this uncertainty area.'),
  description: z.string().min(1).describe('A description of this uncertainty area.'),
})

export type UncertaintyArea = z.infer<typeof UncertaintyAreaSchema>

export function createUncertaintyAreaTasks(
  areas: UncertaintyArea[],
  taskTitle: string,
  taskDependsOnTaskIDs: TaskID[]
): Array<Task> {
  return areas.map(
    (area) =>
      ({
        taskID: newTaskID(),
        currentStatus: TaskStatusSchema.parse('not-started'),
        title: `Resolve uncertainty: ${area.title} for task: ${taskTitle}`,
        description: `Gain understanding about: ${area.description}`,
        goal: `Resolve uncertainty: ${area.title}`,
        readonly: true,
        definitionsOfDone: ['Uncertainty resolved with clear, documented understanding.'],
        dependsOnTaskIDs: taskDependsOnTaskIDs,
      } satisfies Task)
  )
}
