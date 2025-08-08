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
      definitionsOfDone: ['All acceptance criteria met'],
      dependsOnTaskIDs: [],
      uncertaintyAreas: [],
    }

    const result = await handleCreateTask(args, taskDB)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')
    expect(result.content).toBeInstanceOf(Array)
    expect(result.content).toHaveLength(1)
    expect(result.structuredContent).toHaveProperty('tasksCreated')
    expect(result.structuredContent.tasksCreated[0].currentStatus).toBe('not-started')
    expect(result.structuredContent.tasksCreated.at(-1)!.title).toBe('Test Task')
  })

  it('should create uncertainty area tasks and link them as dependencies', async () => {
    const taskDB = new TaskDB()
    const args = {
      title: 'Uncertain Task',
      description: 'Task with uncertainties',
      goal: 'Uncertain goal',
      definitionsOfDone: ['All uncertainties resolved'],
      dependsOnTaskIDs: [],
      uncertaintyAreas: [
        { title: 'Clarify input', description: 'Need more info' },
        { title: 'Define output', description: 'Clarify requirements' },
      ],
    }

    const result = await handleCreateTask(args, taskDB)

    expect(result.structuredContent.tasksCreated).toHaveLength(3)
    const areaTasks = result.structuredContent.tasksCreated.slice(0, 2)
    const mainTask = result.structuredContent.tasksCreated[2]
    expect(mainTask.dependsOnTaskIDs).toEqual([...args.dependsOnTaskIDs, ...areaTasks.map((t: any) => t.taskID)])
    expect(mainTask.title).toBe('Uncertain Task')
  })

  it('should create a task with dependent tasks', async () => {
    const taskDB = new TaskDB()
    const dependentTaskID1 = TaskIDSchema.parse('dep1')
    const dependentTaskID2 = TaskIDSchema.parse('dep2')

    taskDB.set(dependentTaskID1, {
      taskID: dependentTaskID1,
      currentStatus: 'complete' as any,
      title: 'Dep Task 1',
      description: 'Dep task 1 description',
      goal: 'Dep goal 1',
      definitionsOfDone: ['Done'],
      dependsOnTaskIDs: [],
    })

    taskDB.set(dependentTaskID2, {
      taskID: dependentTaskID2,
      currentStatus: 'complete' as any,
      title: 'Dep Task 2',
      description: 'Dep task 2 description',
      goal: 'Dep goal 2',
      definitionsOfDone: ['Done'],
      dependsOnTaskIDs: [],
    })

    const args = {
      title: 'Dependent Task',
      description: 'This task depends on others',
      goal: 'Dependent goal',
      definitionsOfDone: ['Criteria met'],
      dependsOnTaskIDs: [dependentTaskID1, dependentTaskID2],
      uncertaintyAreas: [],
    }

    const result = await handleCreateTask(args, taskDB)

    const mainTask = result.structuredContent.tasksCreated.at(-1)!
    expect(mainTask.dependsOnTaskIDs).toEqual([dependentTaskID1, dependentTaskID2])
    expect(mainTask.title).toBe('Dependent Task')
  })

  it('should generate unique task IDs for each task creation', async () => {
    const taskDB = new TaskDB()
    const args = {
      title: 'Test Task',
      description: 'Same description',
      goal: 'Same goal',
      definitionsOfDone: ['All done'],
      dependsOnTaskIDs: [],
      uncertaintyAreas: [],
    }

    const result1 = await handleCreateTask(args, taskDB)
    const result2 = await handleCreateTask(args, taskDB)

    const id1 = result1.structuredContent.tasksCreated.at(-1)!.taskID
    const id2 = result2.structuredContent.tasksCreated.at(-1)!.taskID
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('should throw error when dependent task does not exist', async () => {
    const taskDB = new TaskDB()
    const nonExistentDepID = TaskIDSchema.parse('nonexistent-dep')

    const args = {
      title: 'Dependent Task',
      description: 'Task with invalid dependency',
      goal: 'Test goal',
      definitionsOfDone: ['Done'],
      dependsOnTaskIDs: [nonExistentDepID],
      uncertaintyAreas: [],
    }

    await expect(handleCreateTask(args, taskDB)).rejects.toThrowError(
      `Invalid task: Unknown dependent task ID: ${nonExistentDepID}`
    )
  })
})
