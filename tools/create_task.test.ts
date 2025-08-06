import { describe, expect, it } from 'vitest'
import { handleCreateTask } from './create_task.js'
import { TaskDB } from './task_db.js'
import { TaskIDSchema } from './tasks.js'

describe('create_task handler', () => {
  it('should create a task with required fields', async () => {
    const taskDB = new TaskDB()
    const args = {
      title: 'Test Task',
      description: 'This is a test task',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    }

    const result = await handleCreateTask(args, taskDB)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')
    expect(result.content).toBeInstanceOf(Array)
    expect(result.content).toHaveLength(1)
    expect(result.content[0]).toMatchObject({
      type: 'text',
      audience: ['assistant'],
    })
    expect(result.structuredContent).toHaveProperty('task')
    expect(result.structuredContent.task.currentStatus).toBe('not-started')
  })

  it('should create a task with parent task', async () => {
    const taskDB = new TaskDB()
    const parentTaskID = TaskIDSchema.parse('parent123')

    // Create a parent task first
    taskDB.set(parentTaskID, {
      taskID: parentTaskID,
      currentStatus: 'in-progress' as any,
      title: 'Parent Task',
      description: 'Parent task description',
      goal: 'Parent goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      title: 'Child Task',
      description: 'This is a child task',
      goal: 'Child goal',
      parentTaskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    }

    const result = await handleCreateTask(args, taskDB)

    // The structured content includes the created task
    expect(result.structuredContent.task).toBeDefined()
  })

  it('should create a task with dependent tasks', async () => {
    const taskDB = new TaskDB()
    const dependentTaskID1 = TaskIDSchema.parse('dep1')
    const dependentTaskID2 = TaskIDSchema.parse('dep2')

    // Create dependent tasks first
    taskDB.set(dependentTaskID1, {
      taskID: dependentTaskID1,
      currentStatus: 'complete' as any,
      title: 'Dep Task 1',
      description: 'Dep task 1 description',
      goal: 'Dep goal 1',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    taskDB.set(dependentTaskID2, {
      taskID: dependentTaskID2,
      currentStatus: 'complete' as any,
      title: 'Dep Task 2',
      description: 'Dep task 2 description',
      goal: 'Dep goal 2',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      title: 'Dependent Task',
      description: 'This task depends on others',
      goal: 'Dependent goal',
      dependentTaskIDs: [dependentTaskID1, dependentTaskID2],
      uncertaintyAreas: [],
    }

    const result = await handleCreateTask(args, taskDB)

    expect(result.structuredContent.task).toBeDefined()
  })

  it('should create a task with uncertainty areas', async () => {
    const taskDB = new TaskDB()
    const args = {
      title: 'Uncertain Task',
      description: 'Task with uncertainties',
      goal: 'Uncertain goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [{ description: 'Need more info' }, { description: 'Clarify requirements' }],
    }

    const result = await handleCreateTask(args, taskDB)

    expect(result.content[0].text).toContain('uncertainty areas')
  })

  it('should generate unique task IDs for each task creation', async () => {
    const taskDB = new TaskDB()
    const args = {
      title: 'Test Task',
      description: 'Same description',
      goal: 'Same goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    }

    const result1 = await handleCreateTask(args, taskDB)
    const result2 = await handleCreateTask(args, taskDB)

    expect(result1.structuredContent.task.taskID).not.toBe(result2.structuredContent.task.taskID)
    expect(result1.structuredContent.task.taskID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(result2.structuredContent.task.taskID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('should throw error when parent task does not exist', async () => {
    const taskDB = new TaskDB()
    const nonExistentParentID = TaskIDSchema.parse('nonexistent')

    const args = {
      title: 'Child Task',
      description: 'Task with invalid parent',
      goal: 'Test goal',
      parentTaskID: nonExistentParentID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    }

    await expect(handleCreateTask(args, taskDB)).rejects.toThrowError(
      `Invalid task: Unknown parent task ID: ${nonExistentParentID}`
    )
  })

  it('should throw error when parent task is already complete', async () => {
    const taskDB = new TaskDB()
    const completedParentID = TaskIDSchema.parse('completed-parent')

    taskDB.set(completedParentID, {
      taskID: completedParentID,
      currentStatus: 'complete' as any,
      title: 'Completed Parent',
      description: 'This parent is already done',
      goal: 'Completed goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      title: 'Child Task',
      description: 'Task with completed parent',
      goal: 'Test goal',
      parentTaskID: completedParentID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    }

    await expect(handleCreateTask(args, taskDB)).rejects.toThrowError(
      `Invalid task: Parent task '${completedParentID}' is already complete. Use 'transition_task_status' tool to transition parent task status to 'in-progress' first.`
    )
  })

  it('should throw error when dependent task does not exist', async () => {
    const taskDB = new TaskDB()
    const nonExistentDepID = TaskIDSchema.parse('nonexistent-dep')

    const args = {
      title: 'Dependent Task',
      description: 'Task with invalid dependency',
      goal: 'Test goal',
      dependentTaskIDs: [nonExistentDepID],
      uncertaintyAreas: [],
    }

    await expect(handleCreateTask(args, taskDB)).rejects.toThrowError(
      `Invalid task: Unknown dependent task ID: ${nonExistentDepID}`
    )
  })
})
