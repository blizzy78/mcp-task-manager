import { beforeEach, describe, expect, it } from 'vitest'
import { TaskDB } from '../task_db.js'
import { DoneStatus, FailedStatus, InProgressStatus, newTaskID, TodoStatus, type Task } from '../tasks.js'
import { handleCurrentTask } from './current_task.js'

describe('current_task tool handler', () => {
  let taskDB: TaskDB

  beforeEach(() => {
    taskDB = new TaskDB()
  })

  describe('no current task set', () => {
    it('should return empty result when no current task is set', async () => {
      const args = {}

      const result = await handleCurrentTask(args, taskDB)

      expect(result.content).toEqual([])
      expect(result.structuredContent).toMatchObject({
        tasks: [],
      })
    })
  })

  describe('single current task', () => {
    it('should return current task when set', async () => {
      const currentTaskID = newTaskID()
      const currentTask: Task = {
        taskID: currentTaskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'Current Task',
        description: 'This is the current task',
        goal: 'Current goal',
        definitionsOfDone: ['Current done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(currentTaskID, currentTask)
      taskDB.setCurrentTask(currentTaskID)

      const args = {}

      const result = await handleCurrentTask(args, taskDB)

      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: "Use 'task_info' tool to retrieve full task details",
        audience: ['assistant'],
      })

      expect(result.structuredContent).toHaveProperty('tasks')
      const tasks = (result.structuredContent as any).tasks
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).toMatchObject({
        taskID: currentTaskID,
        status: InProgressStatus,
        title: 'Current Task',
        dependsOnTaskIDs: [],
        mustDecomposeBeforeExecution: undefined,
      })
    })

    it('should return todo task with decomposition info', async () => {
      const currentTaskID = newTaskID()
      const currentTask: Task = {
        taskID: currentTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Todo Current Task',
        description: 'Todo task that is current',
        goal: 'Todo goal',
        definitionsOfDone: ['Todo done'],
        criticalPath: true,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'medium, must decompose before execution',
          description: 'Needs decomposition',
        },
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(currentTaskID, currentTask)
      taskDB.setCurrentTask(currentTaskID)

      const args = {}

      const result = await handleCurrentTask(args, taskDB)

      expect(result.structuredContent).toHaveProperty('tasks')
      const tasks = (result.structuredContent as any).tasks
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).toMatchObject({
        taskID: currentTaskID,
        status: TodoStatus,
        title: 'Todo Current Task',
        dependsOnTaskIDs: [],
        mustDecomposeBeforeExecution: true,
      })
    })

    it('should return done task without dependencies', async () => {
      const currentTaskID = newTaskID()
      const currentTask: Task = {
        taskID: currentTaskID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Done Current Task',
        description: 'Completed current task',
        goal: 'Done goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(currentTaskID, currentTask)
      taskDB.setCurrentTask(currentTaskID)

      const args = {}

      const result = await handleCurrentTask(args, taskDB)

      expect(result.structuredContent).toHaveProperty('tasks')
      const tasks = (result.structuredContent as any).tasks
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).toMatchObject({
        taskID: currentTaskID,
        status: DoneStatus,
        title: 'Done Current Task',
      })
      // Should not have dependsOnTaskIDs for done tasks (it should be undefined)
      expect(tasks[0].dependsOnTaskIDs).toBeUndefined()
      expect(tasks[0].mustDecomposeBeforeExecution).toBeUndefined()
    })

    it('should return failed task without dependencies', async () => {
      const currentTaskID = newTaskID()
      const currentTask: Task = {
        taskID: currentTaskID,
        status: FailedStatus,
        dependsOnTaskIDs: [],
        title: 'Failed Current Task',
        description: 'Failed current task',
        goal: 'Failed goal',
        definitionsOfDone: ['Failed'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(currentTaskID, currentTask)
      taskDB.setCurrentTask(currentTaskID)

      const args = {}

      const result = await handleCurrentTask(args, taskDB)

      expect(result.structuredContent).toHaveProperty('tasks')
      const tasks = (result.structuredContent as any).tasks
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).toMatchObject({
        taskID: currentTaskID,
        status: FailedStatus,
        title: 'Failed Current Task',
      })
      // Should not have dependsOnTaskIDs for failed tasks (it should be undefined)
      expect(tasks[0].dependsOnTaskIDs).toBeUndefined()
      expect(tasks[0].mustDecomposeBeforeExecution).toBeUndefined()
    })
  })

  describe('task tree retrieval', () => {
    it('should return task tree with dependencies', async () => {
      // Create a dependency chain: current -> dep1 -> dep2
      const dep2TaskID = newTaskID()
      const dep2Task: Task = {
        taskID: dep2TaskID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Dependency 2',
        description: 'Second level dependency',
        goal: 'Dep2 goal',
        definitionsOfDone: ['Dep2 done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(dep2TaskID, dep2Task)

      const dep1TaskID = newTaskID()
      const dep1Task: Task = {
        taskID: dep1TaskID,
        status: DoneStatus,
        dependsOnTaskIDs: [dep2TaskID],
        title: 'Dependency 1',
        description: 'First level dependency',
        goal: 'Dep1 goal',
        definitionsOfDone: ['Dep1 done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(dep1TaskID, dep1Task)

      const currentTaskID = newTaskID()
      const currentTask: Task = {
        taskID: currentTaskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [dep1TaskID],
        title: 'Current Task',
        description: 'Task with dependencies',
        goal: 'Current goal',
        definitionsOfDone: ['Current done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(currentTaskID, currentTask)
      taskDB.setCurrentTask(currentTaskID)

      const args = {}

      const result = await handleCurrentTask(args, taskDB)

      expect(result.structuredContent).toHaveProperty('tasks')
      const tasks = (result.structuredContent as any).tasks
      expect(tasks).toHaveLength(3)

      const returnedTaskIDs = tasks.map((t: any) => t.taskID)
      expect(returnedTaskIDs).toContain(currentTaskID)
      expect(returnedTaskIDs).toContain(dep1TaskID)
      expect(returnedTaskIDs).toContain(dep2TaskID)

      const currentTaskResult = tasks.find((t: any) => t.taskID === currentTaskID)
      expect(currentTaskResult).toMatchObject({
        taskID: currentTaskID,
        status: InProgressStatus,
        title: 'Current Task',
        dependsOnTaskIDs: [dep1TaskID],
      })
    })

    it('should return task tree with tasks that depend on current task', async () => {
      // Create tasks that depend on the current task: parent -> current
      const currentTaskID = newTaskID()
      const currentTask: Task = {
        taskID: currentTaskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'Current Task',
        description: 'Current task',
        goal: 'Current goal',
        definitionsOfDone: ['Current done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(currentTaskID, currentTask)

      const parentTaskID = newTaskID()
      const parentTask: Task = {
        taskID: parentTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [currentTaskID],
        title: 'Parent Task',
        description: 'Task that depends on current',
        goal: 'Parent goal',
        definitionsOfDone: ['Parent done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(parentTaskID, parentTask)
      taskDB.setCurrentTask(currentTaskID)

      const args = {}

      const result = await handleCurrentTask(args, taskDB)

      expect(result.structuredContent).toHaveProperty('tasks')
      const tasks = (result.structuredContent as any).tasks
      expect(tasks).toHaveLength(2)

      const returnedTaskIDs = tasks.map((t: any) => t.taskID)
      expect(returnedTaskIDs).toContain(currentTaskID)
      expect(returnedTaskIDs).toContain(parentTaskID)

      const parentTaskResult = tasks.find((t: any) => t.taskID === parentTaskID)
      expect(parentTaskResult).toMatchObject({
        taskID: parentTaskID,
        status: TodoStatus,
        title: 'Parent Task',
        dependsOnTaskIDs: [currentTaskID],
      })
    })

    it('should return complex task tree', async () => {
      // Create a complex tree:
      //     parent1
      //        |
      //     current  <-- set as current
      //    /      \
      // dep1      dep2
      //   |        |
      // subdep1  subdep2

      const subdep1ID = newTaskID()
      const subdep1: Task = {
        taskID: subdep1ID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Sub Dependency 1',
        description: 'Sub dependency 1',
        goal: 'Subdep1 goal',
        definitionsOfDone: ['Subdep1 done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(subdep1ID, subdep1)

      const subdep2ID = newTaskID()
      const subdep2: Task = {
        taskID: subdep2ID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Sub Dependency 2',
        description: 'Sub dependency 2',
        goal: 'Subdep2 goal',
        definitionsOfDone: ['Subdep2 done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(subdep2ID, subdep2)

      const dep1ID = newTaskID()
      const dep1: Task = {
        taskID: dep1ID,
        status: DoneStatus,
        dependsOnTaskIDs: [subdep1ID],
        title: 'Dependency 1',
        description: 'Dependency 1',
        goal: 'Dep1 goal',
        definitionsOfDone: ['Dep1 done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(dep1ID, dep1)

      const dep2ID = newTaskID()
      const dep2: Task = {
        taskID: dep2ID,
        status: DoneStatus,
        dependsOnTaskIDs: [subdep2ID],
        title: 'Dependency 2',
        description: 'Dependency 2',
        goal: 'Dep2 goal',
        definitionsOfDone: ['Dep2 done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(dep2ID, dep2)

      const currentTaskID = newTaskID()
      const currentTask: Task = {
        taskID: currentTaskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [dep1ID, dep2ID],
        title: 'Current Task',
        description: 'Complex current task',
        goal: 'Current goal',
        definitionsOfDone: ['Current done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(currentTaskID, currentTask)

      const parent1ID = newTaskID()
      const parent1: Task = {
        taskID: parent1ID,
        status: TodoStatus,
        dependsOnTaskIDs: [currentTaskID],
        title: 'Parent 1',
        description: 'Parent task',
        goal: 'Parent goal',
        definitionsOfDone: ['Parent done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(parent1ID, parent1)

      taskDB.setCurrentTask(currentTaskID)

      const args = {}

      const result = await handleCurrentTask(args, taskDB)

      expect(result.structuredContent).toHaveProperty('tasks')
      const tasks = (result.structuredContent as any).tasks
      expect(tasks).toHaveLength(6)

      const returnedTaskIDs = tasks.map((t: any) => t.taskID)
      expect(returnedTaskIDs).toContain(currentTaskID)
      expect(returnedTaskIDs).toContain(parent1ID)
      expect(returnedTaskIDs).toContain(dep1ID)
      expect(returnedTaskIDs).toContain(dep2ID)
      expect(returnedTaskIDs).toContain(subdep1ID)
      expect(returnedTaskIDs).toContain(subdep2ID)
    })
  })

  describe('empty content scenarios', () => {
    it('should return empty tasks when current task set but task tree is empty', async () => {
      const currentTaskID = newTaskID()
      const currentTask: Task = {
        taskID: currentTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Empty Tree Task',
        description: 'Task with empty tree',
        goal: 'Empty goal',
        definitionsOfDone: ['Empty done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(currentTaskID, currentTask)
      taskDB.setCurrentTask(currentTaskID)

      const args = {}

      const result = await handleCurrentTask(args, taskDB)

      expect(result.content).toHaveLength(1)
      expect(result.structuredContent).toHaveProperty('tasks')
      const tasks = (result.structuredContent as any).tasks
      expect(tasks).toHaveLength(1) // Should have the current task itself
    })
  })

  describe('result formatting', () => {
    it('should format tasks with correct properties based on status', async () => {
      const todoTaskID = newTaskID()
      const todoTask: Task = {
        taskID: todoTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Todo Task',
        description: 'Todo task',
        goal: 'Todo goal',
        definitionsOfDone: ['Todo done'],
        criticalPath: true,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'low, may benefit from decomposition before execution',
          description: 'Low complexity',
        },
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(todoTaskID, todoTask)

      const inProgressTaskID = newTaskID()
      const inProgressTask: Task = {
        taskID: inProgressTaskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [todoTaskID],
        title: 'In Progress Task',
        description: 'In progress task',
        goal: 'In progress goal',
        definitionsOfDone: ['In progress done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(inProgressTaskID, inProgressTask)

      taskDB.setCurrentTask(inProgressTaskID)

      const args = {}

      const result = await handleCurrentTask(args, taskDB)

      expect(result.structuredContent).toHaveProperty('tasks')
      const tasks = (result.structuredContent as any).tasks
      const todoTaskResult = tasks.find((t: any) => t.taskID === todoTaskID)
      const inProgressTaskResult = tasks.find((t: any) => t.taskID === inProgressTaskID)

      // Todo task should have mustDecomposeBeforeExecution
      expect(todoTaskResult).toMatchObject({
        taskID: todoTaskID,
        status: TodoStatus,
        title: 'Todo Task',
        dependsOnTaskIDs: [],
        mustDecomposeBeforeExecution: undefined, // Low complexity doesn't require decomposition
      })

      // In progress task should have dependsOnTaskIDs but no mustDecomposeBeforeExecution
      expect(inProgressTaskResult).toMatchObject({
        taskID: inProgressTaskID,
        status: InProgressStatus,
        title: 'In Progress Task',
        dependsOnTaskIDs: [todoTaskID],
      })
      // mustDecomposeBeforeExecution should be undefined for non-todo tasks
      expect(inProgressTaskResult.mustDecomposeBeforeExecution).toBeUndefined()
    })
  })
})
