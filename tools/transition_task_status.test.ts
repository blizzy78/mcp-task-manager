import { describe, expect, it } from 'vitest'
import { TaskDB } from './task_db.js'
import { TaskIDSchema, TaskStatusSchema } from './tasks.js'
import { handleTransitionTaskStatus } from './transition_task_status.js'

describe('transition_task_status handler', () => {
  it('should transition from not-started to in-progress', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')
    expect(result.content[0].text).toContain('task123')
    expect(result.content[0].text).toContain('in-progress')
  })

  it('should transition from in-progress to complete with outcome details', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'in-progress' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
      outcomeDetails: 'Task completed successfully',
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result.content[0].text).toContain('task123')
    expect(result.content[0].text).toContain('complete')
  })

  it('should throw error for invalid transition', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Invalid status transition')
  })

  it('should throw error when dependent task is not complete', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')
    const depTaskID = TaskIDSchema.parse('dep123')

    taskDB.set(depTaskID, {
      taskID: depTaskID,
      currentStatus: 'in-progress' as any,
      title: 'Dependent Task',
      description: 'Dependent description',
      goal: 'Dependent goal',
      dependsOnTaskIDs: [],
    })

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependsOnTaskIDs: [depTaskID],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      "Invalid status transition: Task 'task123' depends on task 'dep123' which is not 'complete'."
    )
  })

  it('should throw error when completing without outcome details', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'in-progress' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      `Invalid status transition: Must provide outcomeDetails to complete task '${taskID}'.`
    )
  })

  it('should allow transition from complete back to in-progress', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'complete' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result.content[0].text).toContain('task123')
    expect(result.content[0].text).toContain('in-progress')
  })

  it('should handle successful transition with dependencies', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')
    const depTaskID = TaskIDSchema.parse('dep123')

    taskDB.set(depTaskID, {
      taskID: depTaskID,
      currentStatus: 'complete' as any,
      title: 'Dependent Task',
      description: 'Dependent description',
      goal: 'Dependent goal',
      dependsOnTaskIDs: [],
    })

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependsOnTaskIDs: [depTaskID],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result.content[0].text).toContain('task123')
    expect(result.content[0].text).toContain('in-progress')
  })

  it('should throw error for invalid old status', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'invalid-status' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Invalid current status')
  })

  it('should throw error for invalid transition from in-progress', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'in-progress' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('not-started'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Invalid status transition')
  })

  it('should throw error for invalid transition from complete', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'complete' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Invalid status transition')
  })

  it('should throw error for non-existent task', async () => {
    const taskDB = new TaskDB()
    const nonExistentTaskID = TaskIDSchema.parse('non-existent-task')

    const args = {
      taskID: nonExistentTaskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      `Invalid status transition: Unknown task ID: ${nonExistentTaskID}`
    )
  })
})
