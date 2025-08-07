import { randomUUID } from 'node:crypto'
import { TaskIDSchema, type TaskID, type TaskStatus } from './tasks.js'

export type Task = {
  taskID: TaskID
  currentStatus: TaskStatus
  title: string
  description: string
  goal: string
  dependsOnTaskIDs: Array<TaskID>
}

export class TaskDB {
  private store = new Map<TaskID, Task>()

  set(taskID: TaskID, task: Task) {
    this.store.set(taskID, task)
  }

  get(taskID: TaskID) {
    return this.store.get(taskID)
  }
}

export function newTaskID() {
  return TaskIDSchema.parse(randomUUID())
}
