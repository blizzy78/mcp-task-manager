import { beforeEach, describe, expect, it } from 'vitest'
import { TaskDB } from '../task_db.js'
import { DoneStatus, InProgressStatus, newTaskID, TodoStatus, type Task } from '../tasks.js'
import { handleTaskInfo } from './task_info.js'

describe('task_info tool handler', () => {
  let taskDB: TaskDB

  beforeEach(() => {
    taskDB = new TaskDB()
  })

  describe('single task retrieval', () => {
    it('should return full task details for existing task', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Test Task',
        description: 'Test task description',
        goal: 'Test goal',
        definitionsOfDone: ['Task is complete'],
        criticalPath: true,
        uncertaintyAreas: [
          {
            title: 'Test uncertainty',
            description: 'Test uncertainty description',
          },
        ],
        estimatedComplexity: {
          level: 'medium, must decompose before execution',
          description: 'Medium complexity task',
        },
        lessonsLearned: ['Test lesson'],
        verificationEvidence: ['Test evidence'],
      }
      taskDB.set(taskID, task)

      const args = {
        taskIDs: [taskID],
      }

      const result = await handleTaskInfo(args, taskDB)

      expect(result.content).toEqual([])
      expect(result.structuredContent).toMatchObject({
        tasks: [task],
        notFoundTasks: [],
      })
    })

    it('should handle non-existent task', async () => {
      const nonExistentID = newTaskID()

      const args = {
        taskIDs: [nonExistentID],
      }

      const result = await handleTaskInfo(args, taskDB)

      expect(result.structuredContent).toMatchObject({
        tasks: [],
        notFoundTasks: [nonExistentID],
      })
    })
  })

  describe('multiple task retrieval', () => {
    it('should return multiple existing tasks', async () => {
      const task1ID = newTaskID()
      const task1: Task = {
        taskID: task1ID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'First Task',
        description: 'First task description',
        goal: 'First goal',
        definitionsOfDone: ['First done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(task1ID, task1)

      const task2ID = newTaskID()
      const task2: Task = {
        taskID: task2ID,
        status: InProgressStatus,
        dependsOnTaskIDs: [task1ID],
        title: 'Second Task',
        description: 'Second task description',
        goal: 'Second goal',
        definitionsOfDone: ['Second done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: ['Second lesson'],
        verificationEvidence: [],
      }
      taskDB.set(task2ID, task2)

      const task3ID = newTaskID()
      const task3: Task = {
        taskID: task3ID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Third Task',
        description: 'Third task description',
        goal: 'Third goal',
        definitionsOfDone: ['Third done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: ['Third evidence'],
      }
      taskDB.set(task3ID, task3)

      const args = {
        taskIDs: [task1ID, task2ID, task3ID],
      }

      const result = await handleTaskInfo(args, taskDB)

      expect(result.structuredContent.tasks).toHaveLength(3)
      expect(result.structuredContent.notFoundTasks).toHaveLength(0)

      expect(result.structuredContent.tasks).toContainEqual(task1)
      expect(result.structuredContent.tasks).toContainEqual(task2)
      expect(result.structuredContent.tasks).toContainEqual(task3)
    })

    it('should handle mix of existing and non-existent tasks', async () => {
      const existingTaskID = newTaskID()
      const existingTask: Task = {
        taskID: existingTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Existing Task',
        description: 'This task exists',
        goal: 'Existing goal',
        definitionsOfDone: ['Existing done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(existingTaskID, existingTask)

      const nonExistentID1 = newTaskID()
      const nonExistentID2 = newTaskID()

      const args = {
        taskIDs: [existingTaskID, nonExistentID1, nonExistentID2],
      }

      const result = await handleTaskInfo(args, taskDB)

      expect(result.structuredContent.tasks).toHaveLength(1)
      expect(result.structuredContent.tasks[0]).toEqual(existingTask)
      expect(result.structuredContent.notFoundTasks).toHaveLength(2)
      expect(result.structuredContent.notFoundTasks).toContain(nonExistentID1)
      expect(result.structuredContent.notFoundTasks).toContain(nonExistentID2)
    })

    it('should handle all non-existent tasks', async () => {
      const nonExistentID1 = newTaskID()
      const nonExistentID2 = newTaskID()
      const nonExistentID3 = newTaskID()

      const args = {
        taskIDs: [nonExistentID1, nonExistentID2, nonExistentID3],
      }

      const result = await handleTaskInfo(args, taskDB)

      expect(result.structuredContent.tasks).toHaveLength(0)
      expect(result.structuredContent.notFoundTasks).toHaveLength(3)
      expect(result.structuredContent.notFoundTasks).toContain(nonExistentID1)
      expect(result.structuredContent.notFoundTasks).toContain(nonExistentID2)
      expect(result.structuredContent.notFoundTasks).toContain(nonExistentID3)
    })
  })

  describe('task details completeness', () => {
    it('should return all task properties', async () => {
      const depTaskID = newTaskID()
      const depTask: Task = {
        taskID: depTaskID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Dependency Task',
        description: 'Task that is a dependency',
        goal: 'Dependency goal',
        definitionsOfDone: ['Dependency done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(depTaskID, depTask)

      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [depTaskID],
        title: 'Complete Task',
        description: 'Task with all properties',
        goal: 'Complete goal',
        definitionsOfDone: ['First criterion', 'Second criterion'],
        criticalPath: true,
        uncertaintyAreas: [
          {
            title: 'First uncertainty',
            description: 'First uncertainty description',
          },
          {
            title: 'Second uncertainty',
            description: 'Second uncertainty description',
          },
        ],
        estimatedComplexity: {
          level: 'high, must decompose before execution',
          description: 'Very complex task',
        },
        lessonsLearned: ['First lesson', 'Second lesson'],
        verificationEvidence: ['First evidence', 'Second evidence'],
      }
      taskDB.set(taskID, task)

      const args = {
        taskIDs: [taskID],
      }

      const result = await handleTaskInfo(args, taskDB)

      const returnedTask = result.structuredContent.tasks[0]

      expect(returnedTask).toEqual(task)
      expect(returnedTask.taskID).toBe(taskID)
      expect(returnedTask.status).toBe(InProgressStatus)
      expect(returnedTask.dependsOnTaskIDs).toEqual([depTaskID])
      expect(returnedTask.title).toBe('Complete Task')
      expect(returnedTask.description).toBe('Task with all properties')
      expect(returnedTask.goal).toBe('Complete goal')
      expect(returnedTask.definitionsOfDone).toEqual(['First criterion', 'Second criterion'])
      expect(returnedTask.criticalPath).toBe(true)
      expect(returnedTask.uncertaintyAreas).toHaveLength(2)
      expect(returnedTask.estimatedComplexity).toMatchObject({
        level: 'high, must decompose before execution',
        description: 'Very complex task',
      })
      expect(returnedTask.lessonsLearned).toEqual(['First lesson', 'Second lesson'])
      expect(returnedTask.verificationEvidence).toEqual(['First evidence', 'Second evidence'])
    })

    it('should return task with minimal properties', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Minimal Task',
        description: 'Minimal description',
        goal: 'Minimal goal',
        definitionsOfDone: ['Minimal done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        taskIDs: [taskID],
      }

      const result = await handleTaskInfo(args, taskDB)

      const returnedTask = result.structuredContent.tasks[0]

      expect(returnedTask).toEqual(task)
      expect(returnedTask.uncertaintyAreas).toEqual([])
      expect(returnedTask.lessonsLearned).toEqual([])
      expect(returnedTask.verificationEvidence).toEqual([])
      expect(returnedTask.estimatedComplexity).toBeUndefined()
    })
  })

  describe('task ordering', () => {
    it('should return tasks in the order they were requested', async () => {
      const task1ID = newTaskID()
      const task1: Task = {
        taskID: task1ID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'First Task',
        description: 'First',
        goal: 'First goal',
        definitionsOfDone: ['First done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(task1ID, task1)

      const task2ID = newTaskID()
      const task2: Task = {
        taskID: task2ID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'Second Task',
        description: 'Second',
        goal: 'Second goal',
        definitionsOfDone: ['Second done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(task2ID, task2)

      const task3ID = newTaskID()
      const task3: Task = {
        taskID: task3ID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Third Task',
        description: 'Third',
        goal: 'Third goal',
        definitionsOfDone: ['Third done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(task3ID, task3)

      // Request in specific order
      const args = {
        taskIDs: [task3ID, task1ID, task2ID],
      }

      const result = await handleTaskInfo(args, taskDB)

      expect(result.structuredContent.tasks).toHaveLength(3)
      expect(result.structuredContent.tasks[0].taskID).toBe(task3ID)
      expect(result.structuredContent.tasks[1].taskID).toBe(task1ID)
      expect(result.structuredContent.tasks[2].taskID).toBe(task2ID)
    })
  })

  describe('edge cases', () => {
    it('should handle duplicate task IDs', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Duplicate Test Task',
        description: 'Testing duplicates',
        goal: 'Duplicate goal',
        definitionsOfDone: ['Duplicate done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        taskIDs: [taskID, taskID, taskID], // Same ID multiple times
      }

      const result = await handleTaskInfo(args, taskDB)

      // Should return the task multiple times as requested
      expect(result.structuredContent.tasks).toHaveLength(3)
      expect(result.structuredContent.tasks[0]).toEqual(task)
      expect(result.structuredContent.tasks[1]).toEqual(task)
      expect(result.structuredContent.tasks[2]).toEqual(task)
      expect(result.structuredContent.notFoundTasks).toHaveLength(0)
    })

    it('should handle mix of duplicate existing and non-existent IDs', async () => {
      const existingTaskID = newTaskID()
      const existingTask: Task = {
        taskID: existingTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Existing Task',
        description: 'Exists',
        goal: 'Existing goal',
        definitionsOfDone: ['Existing done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(existingTaskID, existingTask)

      const nonExistentID = newTaskID()

      const args = {
        taskIDs: [existingTaskID, nonExistentID, existingTaskID, nonExistentID],
      }

      const result = await handleTaskInfo(args, taskDB)

      expect(result.structuredContent.tasks).toHaveLength(2)
      expect(result.structuredContent.tasks[0]).toEqual(existingTask)
      expect(result.structuredContent.tasks[1]).toEqual(existingTask)

      expect(result.structuredContent.notFoundTasks).toHaveLength(2)
      expect(result.structuredContent.notFoundTasks[0]).toBe(nonExistentID)
      expect(result.structuredContent.notFoundTasks[1]).toBe(nonExistentID)
    })
  })
})
