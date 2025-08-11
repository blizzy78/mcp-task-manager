import { describe, expect, it } from 'vitest'
import type { Task } from './task_db.js'
import { TaskDB } from './task_db.js'
import { TaskIDSchema, TaskStatusSchema, type TaskID, type TaskStatus } from './tasks.js'

function createTaskID(id: string): TaskID {
  return TaskIDSchema.parse(id)
}

function createTaskStatus(status: string): TaskStatus {
  return TaskStatusSchema.parse(status)
}

function createTestTask(taskID: string, currentStatus: string, title: string, dependsOnTaskIDs: string[] = []): Task {
  return {
    taskID: createTaskID(taskID),
    currentStatus: createTaskStatus(currentStatus),
    title,
    description: `Description for ${title}`,
    goal: `Goal for ${title}`,
    definitionsOfDone: [`${title} completed`],
    dependsOnTaskIDs: dependsOnTaskIDs.map(createTaskID),
  }
}

describe('TaskDB', () => {
  describe('set and get methods', () => {
    it('should store and retrieve a task', () => {
      const taskDB = new TaskDB()
      const task = createTestTask('test-task-1', 'not-started', 'Test Task')

      taskDB.set(task.taskID, task)
      const retrieved = taskDB.get(task.taskID)

      expect(retrieved).toEqual(task)
    })

    it('should return undefined for non-existent task', () => {
      const taskDB = new TaskDB()
      const retrieved = taskDB.get(createTaskID('non-existent'))

      expect(retrieved).toBeUndefined()
    })
  })

  describe('getAllInTree method', () => {
    it('should return single task when no dependencies', () => {
      const taskDB = new TaskDB()
      const task = createTestTask('task-1', 'not-started', 'Single Task')

      taskDB.set(task.taskID, task)
      const tree = taskDB.getAllInTree(task.taskID)

      expect(tree).toHaveLength(1)
      expect(tree[0]).toEqual(task)
    })

    it('should include tasks with forward dependencies', () => {
      const taskDB = new TaskDB()

      const depTask = createTestTask('dep-task', 'complete', 'Dependency Task')
      const mainTask = createTestTask('main-task', 'not-started', 'Main Task', ['dep-task'])

      taskDB.set(depTask.taskID, depTask)
      taskDB.set(mainTask.taskID, mainTask)

      const tree = taskDB.getAllInTree(mainTask.taskID).map((t) => t.taskID)

      expect(tree).toHaveLength(2)
      expect(tree).toContain(createTaskID('main-task'))
      expect(tree).toContain(createTaskID('dep-task'))
    })

    it('should include tasks with reverse dependencies (tasks depending on current task)', () => {
      const taskDB = new TaskDB()

      const baseTask = createTestTask('base-task', 'complete', 'Base Task')
      const dependentTask = createTestTask('dependent-task', 'not-started', 'Dependent Task', ['base-task'])

      taskDB.set(baseTask.taskID, baseTask)
      taskDB.set(dependentTask.taskID, dependentTask)

      const tree = taskDB.getAllInTree(baseTask.taskID).map((t) => t.taskID)

      expect(tree).toHaveLength(2)
      expect(tree).toContain(createTaskID('base-task'))
      expect(tree).toContain(createTaskID('dependent-task'))
    })

    it('should handle circular dependencies without infinite loop', () => {
      const taskDB = new TaskDB()

      const task1 = createTestTask('task-1', 'not-started', 'Task 1', ['task-2'])
      const task2 = createTestTask('task-2', 'not-started', 'Task 2', ['task-1'])

      taskDB.set(task1.taskID, task1)
      taskDB.set(task2.taskID, task2)

      const tree = taskDB.getAllInTree(task1.taskID).map((t) => t.taskID)

      expect(tree).toHaveLength(2)
      expect(tree).toContain(createTaskID('task-1'))
      expect(tree).toContain(createTaskID('task-2'))
    })

    describe('complex dependency trees with multiple levels', () => {
      const taskDB = new TaskDB()

      // Create a complex tree: root -> dep1/dep2, dep1 -> subdep
      const subdep = createTestTask('subdep', 'complete', 'Sub Dependency')
      const dep1 = createTestTask('dep1', 'complete', 'Dependency 1', ['subdep'])
      const dep2 = createTestTask('dep2', 'complete', 'Dependency 2')
      const root = createTestTask('root', 'not-started', 'Root Task', ['dep1', 'dep2'])

      taskDB.set(subdep.taskID, subdep)
      taskDB.set(dep1.taskID, dep1)
      taskDB.set(dep2.taskID, dep2)
      taskDB.set(root.taskID, root)

      for (const taskID of ['root', 'dep1', 'dep2', 'subdep']) {
        it(`should get all tasks in tree for ${taskID}`, () => {
          let tree = taskDB.getAllInTree(createTaskID(taskID)).map((t) => t.taskID)

          expect(tree).toContain(createTaskID('root'))
          expect(tree).toContain(createTaskID('dep1'))
          expect(tree).toContain(createTaskID('dep2'))
          expect(tree).toContain(createTaskID('subdep'))
          expect(tree).toHaveLength(4)
        })
      }
    })
  })

  describe('single agent mode', () => {
    it('should not track current in-progress task in normal mode', () => {
      const taskDB = new TaskDB()
      const taskID = createTaskID('test-task')

      expect(taskDB.getCurrentInProgressTask()).toBeUndefined()

      taskDB.setCurrentInProgressTask(taskID)
      expect(taskDB.getCurrentInProgressTask()).toBeUndefined() // Should still be undefined in normal mode
    })

    it('should track current in-progress task in single agent mode', () => {
      const taskDB = new TaskDB(true)
      const taskID = createTaskID('test-task')

      expect(taskDB.getCurrentInProgressTask()).toBeUndefined()

      taskDB.setCurrentInProgressTask(taskID)
      expect(taskDB.getCurrentInProgressTask()).toBe(taskID)

      taskDB.setCurrentInProgressTask(undefined)
      expect(taskDB.getCurrentInProgressTask()).toBeUndefined()
    })

    it('should default to normal mode when no parameter provided', () => {
      const taskDB = new TaskDB()
      const taskID = createTaskID('test-task')

      taskDB.setCurrentInProgressTask(taskID)
      expect(taskDB.getCurrentInProgressTask()).toBeUndefined() // Should behave like normal mode
    })
  })
})
