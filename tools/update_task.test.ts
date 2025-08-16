import { describe, expect, it } from 'vitest'
import { TaskDB } from './task_db.js'
import { TaskIDSchema } from './tasks.js'
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [],
          newUncertaintyAreas: [{ title: 'Updated uncertainty', description: 'Updated uncertainty' }],
          newDefinitionsOfDone: ['Updated DoD'],
        },
      ],
    }

    const result = await handleUpdateTask(args, taskDB)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')
    expect(result.content).toBeInstanceOf(Array)
    expect(result.content).toHaveLength(1)
    expect(result.content[0].text).toBe('Pay attention to the task execution constraints.')
    expect(result.structuredContent.tasksUpdated[0].title).toBe('Test Task')
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [],
          newUncertaintyAreas: [],
        },
      ],
    }

    const result = await handleUpdateTask(args, taskDB)

    expect(result.content).toHaveLength(0)
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [],
          newUncertaintyAreas: [{ title: 'Resolved issue', description: 'Issue was resolved' }],
        },
      ],
    }

    const result = await handleUpdateTask(args, taskDB)

    expect(result.structuredContent.tasksCreated?.length ?? 0).toBe(1)
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [],
          newUncertaintyAreas: [
            { title: 'Open issue', description: 'Open issue' },
            { title: 'Resolved issue', description: 'Issue was resolved' },
          ],
        },
      ],
    }

    const result = await handleUpdateTask(args, taskDB)

    expect(result.structuredContent.tasksCreated?.length ?? 0).toBe(2)
  })

  it('should throw error for non-existent task ID', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('non-existent-task')

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [],
          newUncertaintyAreas: [],
        },
      ],
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [TaskIDSchema.parse('non-existent-dep')],
          newUncertaintyAreas: [],
        },
      ],
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [TaskIDSchema.parse('non-existent-dep')],
          newUncertaintyAreas: [],
        },
      ],
    }

    await expect(handleUpdateTask(args, taskDB)).rejects.toThrow(
      'Invalid task update: Unknown dependency task: non-existent-dep'
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [],
          newUncertaintyAreas: [{ title: 'Updated area', description: 'Fixed' }],
        },
      ],
    }

    const result2 = await handleUpdateTask(args, taskDB)
    expect(result2.structuredContent.tasksCreated?.length ?? 0).toBe(1)
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [],
          newUncertaintyAreas: [{ title: 'Updated area', description: 'Updated area' }],
        },
      ],
    }

    const result3 = await handleUpdateTask(args, taskDB)
    expect(result3.structuredContent.tasksCreated?.length ?? 0).toBe(1)
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
      definitionsOfDone: ['Initial DoD'],
      dependsOnTaskIDs: [],
    })

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [],
          newUncertaintyAreas: [{ title: 'Resolved area', description: 'Resolved area' }],
        },
      ],
    }

    const result4 = await handleUpdateTask(args, taskDB)
    expect(result4.structuredContent.tasksCreated?.length ?? 0).toBe(1)
  })

  it('should throw error for non-existent task in single agent mode', async () => {
    const taskDB = new TaskDB(true) // Enable single agent mode
    const taskID = TaskIDSchema.parse('non-existent-task')

    const args = {
      updates: [
        {
          taskID,
          newDependsOnTaskIDs: [],
          newUncertaintyAreas: [],
        },
      ],
    }

    await expect(handleUpdateTask(args, taskDB)).rejects.toThrow(
      `Invalid task update: Unknown task ID: ${taskID}. Use 'task_info' tool without taskID to retrieve details on current 'in-progress' task.`
    )
  })
})
