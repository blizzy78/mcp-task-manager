import { describe, expect, it } from 'vitest'
import { TaskDB } from './task_db.js'
import { TaskIDSchema, UncertaintyAreaStatusSchema } from './tasks.js'
import { handleUpdateTask } from './update_task.js'

describe('update_task handler', () => {
  it('should update a task', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [{ description: 'Updated uncertainty' }],
    }

    const result = await handleUpdateTask(args, taskDB)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')
    expect(result.content).toBeInstanceOf(Array)
    expect(result.content).toHaveLength(1)
    expect(result.content[0].text).toContain('task123')
  })

  it('should handle tasks with no uncertainty areas', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task456')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    }

    const result = await handleUpdateTask(args, taskDB)

    expect(result.content[0].text).not.toContain('uncertainty areas')
  })

  it('should handle tasks with resolved uncertainty areas', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task789')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [
        {
          uncertaintyAreaID: 'existing-area' as any,
          description: 'Existing area',
          status: 'unresolved' as any,
        },
      ],
    })

    const args = {
      taskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [
        {
          description: 'Resolved issue',
          uncertaintyAreaID: 'existing-area' as any,
          status: UncertaintyAreaStatusSchema.parse('resolved'),
          resolution: 'Issue was resolved',
        },
      ],
    }

    const result = await handleUpdateTask(args, taskDB)

    expect(result.content[0].text).not.toContain('uncertainty areas')
  })

  it('should handle tasks with mixed uncertainty areas', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task999')

    // Create the task with an existing uncertainty area first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [
        {
          uncertaintyAreaID: 'resolved-area' as any,
          description: 'Existing area',
          status: 'unresolved' as any,
        },
      ],
    })

    const args = {
      taskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [
        { description: 'Open issue' },
        {
          description: 'Resolved issue',
          uncertaintyAreaID: 'resolved-area' as any,
          status: UncertaintyAreaStatusSchema.parse('resolved'),
          resolution: 'Issue was resolved',
        },
      ],
    }

    const result = await handleUpdateTask(args, taskDB)

    expect(result.content[0].text).toContain('uncertainty areas')
  })

  it('should throw error for non-existent task ID', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('non-existent-task')

    const args = {
      taskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    }

    await expect(handleUpdateTask(args, taskDB)).rejects.toThrow(
      'Invalid task update: Unknown task ID: non-existent-task'
    )
  })

  it('should throw error when trying to update completed task', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('completed-task')

    // Create a completed task
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'complete' as any,
      title: 'Completed Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    }

    await expect(handleUpdateTask(args, taskDB)).rejects.toThrow(
      `Invalid task update: Task '${taskID}' is already complete. Use 'transition_task_status' tool to transition task status to 'in-progress' first.`
    )
  })

  it('should throw error for non-existent dependent task ID', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task-with-deps')

    // Create the main task
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Task with Dependencies',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      dependentTaskIDs: [TaskIDSchema.parse('non-existent-dep')],
      uncertaintyAreas: [],
    }

    await expect(handleUpdateTask(args, taskDB)).rejects.toThrow(
      'Invalid task update: Unknown dependent task ID: non-existent-dep'
    )
  })

  it('should throw error for non-existent uncertainty area ID', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task-with-area')

    // Create the task
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Task with Areas',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [
        {
          description: 'Updated area',
          uncertaintyAreaID: 'non-existent-area' as any,
          status: UncertaintyAreaStatusSchema.parse('resolved'),
          resolution: 'Fixed',
        },
      ],
    }

    await expect(handleUpdateTask(args, taskDB)).rejects.toThrow(
      'Invalid task update: Unknown uncertainty area ID: non-existent-area'
    )
  })

  it('should throw error when updating uncertainty area without status', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task-no-status')

    // Create the task with existing uncertainty area
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Task No Status',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [
        {
          uncertaintyAreaID: 'existing-area' as any,
          description: 'Existing area',
          status: 'unresolved' as any,
        },
      ],
    })

    const args = {
      taskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [
        {
          description: 'Updated area',
          uncertaintyAreaID: 'existing-area' as any,
          // Missing status
        },
      ],
    }

    await expect(handleUpdateTask(args, taskDB)).rejects.toThrow(
      `Invalid task update: Invalid update of uncertainty area 'existing-area': Must provide status.`
    )
  })

  it('should throw error when marking area resolved without resolution', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task-no-resolution')

    // Create the task with existing uncertainty area
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Task No Resolution',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [
        {
          uncertaintyAreaID: 'existing-area' as any,
          description: 'Existing area',
          status: 'unresolved' as any,
        },
      ],
    })

    const args = {
      taskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [
        {
          description: 'Resolved area',
          uncertaintyAreaID: 'existing-area' as any,
          status: UncertaintyAreaStatusSchema.parse('resolved'),
          // Missing resolution
        },
      ],
    }

    await expect(handleUpdateTask(args, taskDB)).rejects.toThrow(
      `Invalid task update: Invalid update of uncertainty area 'existing-area': Must provide resolution when updating to status 'resolved'.`
    )
  })
})
