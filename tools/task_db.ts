import type { Task, TaskID } from './tasks.js'

export class TaskDB {
  private store = new Map<TaskID, Task>()

  set(taskID: TaskID, task: Task) {
    this.store.set(taskID, task)
  }

  get(taskID: TaskID) {
    return this.store.get(taskID)
  }

  getSubtasks(parentTaskID: TaskID) {
    return Array.from(this.store.values()).filter((task) => task.parentTaskID === parentTaskID)
  }
}
