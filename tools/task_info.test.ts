import { describe, expect, it } from 'vitest'
import { handleCreateTask } from './create_task.js'
import { TaskDB } from './task_db.js'
import { handleTaskInfo } from './task_info.js'
import { TaskIDSchema, TaskStatusSchema } from './tasks.js'
import { handleTransitionTaskStatus } from './transition_task_status.js'

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

  describe('single agent mode', () => {
    it('should return current in-progress task when no taskID provided in single agent mode', async () => {
      const taskDB = new TaskDB(true) // Enable single agent mode
      const createResult = await handleCreateTask(
        {
          title: 'Single Agent Task',
          description: 'Task for single agent mode',
          goal: 'Goal',
          definitionsOfDone: ['Single Agent DoD'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      // Transition to in-progress
      await handleTransitionTaskStatus({ taskID, newStatus: TaskStatusSchema.parse('in-progress') }, taskDB)

      // Now call task_info without taskID - should return current in-progress task
      const infoResult = await handleTaskInfo({}, taskDB)

      expect(infoResult.structuredContent.task.taskID).toBe(taskID)
      expect(infoResult.structuredContent.task.title).toBe('Single Agent Task')
      expect(infoResult.structuredContent.task.currentStatus).toBe('in-progress')
    })

    it('should throw error when no taskID provided and no current in-progress task in single agent mode', async () => {
      const taskDB = new TaskDB(true) // Enable single agent mode

      await expect(handleTaskInfo({}, taskDB)).rejects.toThrow('No task currently in progress.')
    })

    it('should still work with explicit taskID in single agent mode', async () => {
      const taskDB = new TaskDB(true) // Enable single agent mode
      const createResult = await handleCreateTask(
        {
          title: 'Explicit ID Task',
          description: 'Task with explicit ID',
          goal: 'Goal',
          definitionsOfDone: ['Explicit DoD'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      const infoResult = await handleTaskInfo({ taskID }, taskDB)

      expect(infoResult.structuredContent.task.taskID).toBe(taskID)
      expect(infoResult.structuredContent.task.title).toBe('Explicit ID Task')
    })

    it('should update current task when transitioning task status', async () => {
      const taskDB = new TaskDB(true) // Enable single agent mode
      const createResult = await handleCreateTask(
        {
          title: 'Status Transition Task',
          description: 'Task for status transition',
          goal: 'Goal',
          definitionsOfDone: ['Transition DoD'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      // Initially no current task
      expect(taskDB.getCurrentInProgressTask()).toBeUndefined()

      // Transition to in-progress
      await handleTransitionTaskStatus({ taskID, newStatus: TaskStatusSchema.parse('in-progress') }, taskDB)
      expect(taskDB.getCurrentInProgressTask()).toBe(taskID)

      // Complete the task
      await handleTransitionTaskStatus(
        {
          taskID,
          newStatus: TaskStatusSchema.parse('complete'),
          outcomeDetails: ['Task completed'],
          verificationEvidence: ['Evidence provided'],
        },
        taskDB
      )
      expect(taskDB.getCurrentInProgressTask()).toBeUndefined()
    })

    it('should throw error for non-existent task in single agent mode', async () => {
      const taskDB = new TaskDB(true) // Enable single agent mode
      const taskID = TaskIDSchema.parse('non-existent-task')

      await expect(handleTaskInfo({ taskID }, taskDB)).rejects.toThrow(
        `Invalid task info request: Unknown task ID: ${taskID}. Use 'task_info' tool without taskID to retrieve details on current 'in-progress' task.`
      )
    })

    it('should throw error when no taskID provided in normal mode', async () => {
      const taskDB = new TaskDB()

      await expect(handleTaskInfo({}, taskDB)).rejects.toThrow('Invalid task info request: Unknown task ID: undefined')
    })
  })
})
