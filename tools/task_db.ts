import { type TaskID, type TaskStatus } from './tasks.js'

export type Task = {
  taskID: TaskID
  currentStatus: TaskStatus
  title: string
  description: string
  goal: string
  readonly?: boolean
  definitionsOfDone: Array<string>
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

  // TODO: this could be more efficient, but we're only dealing with a handful of tasks here
  getAllInTree(taskID: TaskID) {
    const resultIDs: Array<TaskID> = [taskID]

    for (;;) {
      let addedMore = false

      for (const id of [...resultIDs]) {
        const task = this.get(id)!

        for (const dependsOnTaskID of task.dependsOnTaskIDs) {
          if (resultIDs.includes(dependsOnTaskID)) {
            continue
          }

          resultIDs.push(dependsOnTaskID)
          addedMore = true
        }

        const dependingOnTaskIDs = Array.from(this.store.values())
          .filter((t) => t.dependsOnTaskIDs.includes(id))
          .map((t) => t.taskID)

        for (const dependingOnTaskID of dependingOnTaskIDs) {
          if (resultIDs.includes(dependingOnTaskID)) {
            continue
          }

          resultIDs.push(dependingOnTaskID)
          addedMore = true
        }
      }

      if (!addedMore) {
        break
      }
    }

    return resultIDs.map((id) => this.get(id)!)
  }
}
