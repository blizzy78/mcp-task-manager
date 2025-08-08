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
      definitionsOfDone: ['Initial DoD'],
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
      outcomeDetails: ['Task completed successfully'],
      verificationEvidence: ['Logs and screenshots stored at /evidence/task123'],
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
      definitionsOfDone: ['Initial DoD'],
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [depTaskID],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      "Invalid status transition: Only one task may ever be 'in-progress'. Task 'dep123' must be completed first."
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
      definitionsOfDone: ['Initial DoD'],
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

  it('should throw error when completing without verification evidence', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'in-progress' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
      outcomeDetails: ['All steps verified'],
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      `Invalid status transition: Must provide verificationEvidence to complete task '${taskID}'.`
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
      definitionsOfDone: ['Initial DoD'],
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      definitionsOfDone: ['Initial DoD'],
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
      definitionsOfDone: ['Initial DoD'],
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
      definitionsOfDone: ['Initial DoD'],
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
      definitionsOfDone: ['Initial DoD'],
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

  it('should include readonly constraint when transitioning readonly task to in-progress', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('readonly-task')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Readonly Task',
      description: 'Test readonly task',
      goal: 'Test readonly goal',
      readonly: true,
      definitionsOfDone: [],
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result.structuredContent.executionConstraints).toContain(
      `IMPORTANT: Task '${taskID}' is read-only: This task must be performed without making any permanent changes, editing code or any other content is not allowed.`
    )
  })

  it('should include definitions of done constraint when transitioning task with definitions to in-progress', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task-with-dod')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Task with DoD',
      description: 'Test task with definitions of done',
      goal: 'Test goal with DoD',
      definitionsOfDone: ['Definition 1', 'Definition 2'],
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result.structuredContent.executionConstraints).toContain(
      `Definitions of done for task '${taskID}' must be met before this task can be considered complete.`
    )
  })

  it('should not include execution constraints for non-readonly task without definitions', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('simple-task')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Simple Task',
      description: 'Test simple task',
      goal: 'Test simple goal',
      definitionsOfDone: [],
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result.structuredContent.executionConstraints).toBeUndefined()
  })

  it('should throw error for invalid transition from complete to not-started', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'complete' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('not-started'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Invalid status transition')
  })
})
