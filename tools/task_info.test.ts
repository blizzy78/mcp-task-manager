import { describe, expect, it } from 'vitest'
import { handleCreateTask } from './create_task.js'
import { TaskDB } from './task_db.js'
import { handleTaskInfo } from './task_info.js'
import { TaskIDSchema } from './tasks.js'

describe('task_info handler', () => {
  it('should return full task info for existing task', async () => {
    const taskDB = new TaskDB()
    const createResult = await handleCreateTask(
      {
        title: 'Info Task',
        description: 'Task for info retrieval',
        goal: 'Goal',
        definitionsOfDone: ['Info DoD'],
        dependsOnTaskIDs: [],
        uncertaintyAreas: [{ title: 'Clarify', description: 'Need clarification' }],
      },
      taskDB
    )

    const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

    const infoResult = await handleTaskInfo({ taskID }, taskDB)

    expect(infoResult.structuredContent.task.taskID).toBe(taskID)
    expect(infoResult.structuredContent.task.title).toBe('Info Task')
    expect(infoResult.structuredContent.task.description).toBe('Task for info retrieval')
    expect(infoResult.structuredContent.task.goal).toBe('Goal')
    // Task shape does not include embedded uncertainty areas; just basic fields
    expect(infoResult.structuredContent.task).toMatchObject({
      taskID,
      title: 'Info Task',
      description: 'Task for info retrieval',
      goal: 'Goal',
      definitionsOfDone: ['Info DoD'],
    })
  })

  it('should throw error for unknown task ID', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('unknown-task')

    await expect(handleTaskInfo({ taskID }, taskDB)).rejects.toThrow(
      `Invalid task info request: Unknown task ID: ${taskID}`
    )
  })
})
