import { beforeEach, describe, expect, it } from 'vitest'
import { TaskDB } from './task_db.js'
import { DoneStatus, FailedStatus, InProgressStatus, newTaskID, type Task, TodoStatus } from './tasks.js'

describe('TaskDB', () => {
  let taskDB: TaskDB

  beforeEach(() => {
    taskDB = new TaskDB()
  })

  describe('basic operations', () => {
    it('should store and retrieve tasks', () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Test Task',
        description: 'A test task',
        goal: 'Test goal',
        definitionsOfDone: ['Task is complete'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskID, task)
      const retrieved = taskDB.get(taskID)

      expect(retrieved).toEqual(task)
    })

    it('should return undefined for non-existent tasks', () => {
      const nonExistentID = newTaskID()
      const retrieved = taskDB.get(nonExistentID)
      expect(retrieved).toBeUndefined()
    })
  })

  describe('current task management', () => {
    it('should set and get current task', () => {
      const taskID = newTaskID()

      taskDB.setCurrentTask(taskID)
      const currentTask = taskDB.getCurrentTask()

      expect(currentTask).toBe(taskID)
    })

    it('should return null when no current task is set', () => {
      const currentTask = taskDB.getCurrentTask()
      expect(currentTask).toBeNull()
    })
  })

  describe('getAllInTree', () => {
    it('should return single task when no dependencies', () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Single Task',
        description: 'A single task',
        goal: 'Single goal',
        definitionsOfDone: ['Task is complete'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskID, task)
      const result = taskDB.getAllInTree(taskID)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(task)
    })

    it('should return task and its dependencies', () => {
      const taskAID = newTaskID()
      const taskBID = newTaskID()

      const taskA: Task = {
        taskID: taskAID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskBID],
        title: 'Task A',
        description: 'Task A depends on B',
        goal: 'Complete A',
        definitionsOfDone: ['A is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskB: Task = {
        taskID: taskBID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task B',
        description: 'Task B is independent',
        goal: 'Complete B',
        definitionsOfDone: ['B is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskAID, taskA)
      taskDB.set(taskBID, taskB)

      const result = taskDB.getAllInTree(taskAID)

      expect(result).toHaveLength(2)
      expect(result.map((t) => t.taskID)).toContain(taskAID)
      expect(result.map((t) => t.taskID)).toContain(taskBID)
    })

    it('should return task and its dependents', () => {
      const taskAID = newTaskID()
      const taskBID = newTaskID()

      const taskA: Task = {
        taskID: taskAID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task A',
        description: 'Task A is independent',
        goal: 'Complete A',
        definitionsOfDone: ['A is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskB: Task = {
        taskID: taskBID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskAID],
        title: 'Task B',
        description: 'Task B depends on A',
        goal: 'Complete B',
        definitionsOfDone: ['B is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskAID, taskA)
      taskDB.set(taskBID, taskB)

      const result = taskDB.getAllInTree(taskAID)

      expect(result).toHaveLength(2)
      expect(result.map((t) => t.taskID)).toContain(taskAID)
      expect(result.map((t) => t.taskID)).toContain(taskBID)
    })

    it('should handle complex dependency trees', () => {
      const taskAID = newTaskID()
      const taskBID = newTaskID()
      const taskCID = newTaskID()
      const taskDID = newTaskID()

      // Tree: A -> B -> C, D -> A
      const taskA: Task = {
        taskID: taskAID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskBID],
        title: 'Task A',
        description: 'Task A',
        goal: 'Complete A',
        definitionsOfDone: ['A is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskB: Task = {
        taskID: taskBID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskCID],
        title: 'Task B',
        description: 'Task B',
        goal: 'Complete B',
        definitionsOfDone: ['B is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskC: Task = {
        taskID: taskCID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task C',
        description: 'Task C',
        goal: 'Complete C',
        definitionsOfDone: ['C is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskD: Task = {
        taskID: taskDID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskAID],
        title: 'Task D',
        description: 'Task D',
        goal: 'Complete D',
        definitionsOfDone: ['D is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskAID, taskA)
      taskDB.set(taskBID, taskB)
      taskDB.set(taskCID, taskC)
      taskDB.set(taskDID, taskD)

      const result = taskDB.getAllInTree(taskAID)

      expect(result).toHaveLength(4)
      expect(result.map((t) => t.taskID)).toContain(taskAID)
      expect(result.map((t) => t.taskID)).toContain(taskBID)
      expect(result.map((t) => t.taskID)).toContain(taskCID)
      expect(result.map((t) => t.taskID)).toContain(taskDID)
    })
  })

  describe('incompleteTasksInTree', () => {
    it('should return empty array when all tasks are complete', () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Complete Task',
        description: 'A completed task',
        goal: 'Complete goal',
        definitionsOfDone: ['Task is complete'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskID, task)

      expect(taskDB.incompleteTasksInTree(taskID)).toHaveLength(0)

      task.status = FailedStatus
      taskDB.set(taskID, task)

      expect(taskDB.incompleteTasksInTree(taskID)).toHaveLength(0)
    })

    it('should return single task when it is incomplete', () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Incomplete Task',
        description: 'An incomplete task',
        goal: 'Incomplete goal',
        definitionsOfDone: ['Task is complete'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskID, task)
      const result = taskDB.incompleteTasksInTree(taskID)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(task)
    })

    it('should filter out done and failed tasks', () => {
      const taskAID = newTaskID()
      const taskBID = newTaskID()
      const taskCID = newTaskID()
      const taskDID = newTaskID()

      const taskA: Task = {
        taskID: taskAID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task A',
        description: 'Todo task',
        goal: 'Complete A',
        definitionsOfDone: ['A is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskB: Task = {
        taskID: taskBID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Task B',
        description: 'Done task',
        goal: 'Complete B',
        definitionsOfDone: ['B is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskC: Task = {
        taskID: taskCID,
        status: FailedStatus,
        dependsOnTaskIDs: [],
        title: 'Task C',
        description: 'Failed task',
        goal: 'Complete C',
        definitionsOfDone: ['C is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskD: Task = {
        taskID: taskDID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'Task D',
        description: 'In progress task',
        goal: 'Complete D',
        definitionsOfDone: ['D is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      // Make A depend on all others to get them in tree
      taskA.dependsOnTaskIDs = [taskBID, taskCID, taskDID]

      taskDB.set(taskAID, taskA)
      taskDB.set(taskBID, taskB)
      taskDB.set(taskCID, taskC)
      taskDB.set(taskDID, taskD)

      const result = taskDB.incompleteTasksInTree(taskAID)

      expect(result).toHaveLength(2)
      expect(result.map((t) => t.taskID)).toContain(taskAID)
      expect(result.map((t) => t.taskID)).toContain(taskDID)
      expect(result.map((t) => t.taskID)).not.toContain(taskBID) // done
      expect(result.map((t) => t.taskID)).not.toContain(taskCID) // failed
    })

    it('should sort tasks by dependencies - simple chain', () => {
      const taskAID = newTaskID()
      const taskBID = newTaskID()
      const taskCID = newTaskID()

      // Chain: A -> B -> C (A depends on B, B depends on C)
      const taskA: Task = {
        taskID: taskAID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskBID],
        title: 'Task A',
        description: 'Task A',
        goal: 'Complete A',
        definitionsOfDone: ['A is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskB: Task = {
        taskID: taskBID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskCID],
        title: 'Task B',
        description: 'Task B',
        goal: 'Complete B',
        definitionsOfDone: ['B is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskC: Task = {
        taskID: taskCID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task C',
        description: 'Task C',
        goal: 'Complete C',
        definitionsOfDone: ['C is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskAID, taskA)
      taskDB.set(taskBID, taskB)
      taskDB.set(taskCID, taskC)

      const result = taskDB.incompleteTasksInTree(taskAID)

      expect(result).toHaveLength(3)
      // C should come first (no dependencies), then B, then A
      expect(result[0].taskID).toBe(taskCID)
      expect(result[1].taskID).toBe(taskBID)
      expect(result[2].taskID).toBe(taskAID)
    })

    it('should prioritize critical path tasks', () => {
      const taskAID = newTaskID()
      const taskBID = newTaskID()
      const taskCID = newTaskID()
      const taskDID = newTaskID()
      const taskEID = newTaskID()

      // A and B both have no dependencies, A is critical, B is not
      // C depends on both A and B
      const taskA: Task = {
        taskID: taskAID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task A',
        description: 'Critical task',
        goal: 'Complete A',
        definitionsOfDone: ['A is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskB: Task = {
        taskID: taskBID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task B',
        description: 'Non-critical task',
        goal: 'Complete B',
        definitionsOfDone: ['B is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskC: Task = {
        taskID: taskCID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task C',
        description: 'Task C',
        goal: 'Complete C',
        definitionsOfDone: ['C is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskD: Task = {
        taskID: taskDID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task D',
        description: 'Task D',
        goal: 'Complete D',
        definitionsOfDone: ['D is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskE: Task = {
        taskID: taskEID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task E',
        description: 'Task E',
        goal: 'Complete E',
        definitionsOfDone: ['E is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskA.dependsOnTaskIDs = [taskBID, taskCID, taskDID, taskEID]

      taskDB.set(taskAID, taskA)
      taskDB.set(taskBID, taskB)
      taskDB.set(taskCID, taskC)
      taskDB.set(taskDID, taskD)
      taskDB.set(taskEID, taskE)

      const result = taskDB.incompleteTasksInTree(taskAID)

      expect(result).toHaveLength(5)
      // C and E must come first, then B and D, then A
      expect(result[0].taskID).toBe(taskCID)
      expect(result[1].taskID).toBe(taskEID)
      expect(result[2].taskID).toBe(taskBID)
      expect(result[3].taskID).toBe(taskDID)
      expect(result[4].taskID).toBe(taskAID)
    })

    it('should handle complex dependency tree with mixed status and critical path', () => {
      const taskAID = newTaskID()
      const taskBID = newTaskID()
      const taskCID = newTaskID()
      const taskDID = newTaskID()
      const taskEID = newTaskID()

      // Complex tree:
      // E (critical) -> no deps
      // D (non-critical) -> no deps
      // C (done) -> no deps
      // B (critical) -> depends on C and D
      // A (non-critical) -> depends on B and E
      const taskA: Task = {
        taskID: taskAID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskBID, taskEID],
        title: 'Task A',
        description: 'Task A',
        goal: 'Complete A',
        definitionsOfDone: ['A is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskB: Task = {
        taskID: taskBID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskCID, taskDID],
        title: 'Task B',
        description: 'Task B',
        goal: 'Complete B',
        definitionsOfDone: ['B is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskC: Task = {
        taskID: taskCID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Task C',
        description: 'Task C',
        goal: 'Complete C',
        definitionsOfDone: ['C is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskD: Task = {
        taskID: taskDID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task D',
        description: 'Task D',
        goal: 'Complete D',
        definitionsOfDone: ['D is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskE: Task = {
        taskID: taskEID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task E',
        description: 'Task E',
        goal: 'Complete E',
        definitionsOfDone: ['E is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskAID, taskA)
      taskDB.set(taskBID, taskB)
      taskDB.set(taskCID, taskC)
      taskDB.set(taskDID, taskD)
      taskDB.set(taskEID, taskE)

      const result = taskDB.incompleteTasksInTree(taskAID)

      expect(result).toHaveLength(4) // C is done, so excluded
      expect(result.map((t) => t.taskID)).toContain(taskAID)
      expect(result.map((t) => t.taskID)).toContain(taskBID)
      expect(result.map((t) => t.taskID)).toContain(taskDID)
      expect(result.map((t) => t.taskID)).toContain(taskEID)
      expect(result.map((t) => t.taskID)).not.toContain(taskCID) // done

      // E and D have no dependencies, E should come first (critical)
      // Then B (depends only on D now since C is done)
      // Then A (depends on B and E)
      expect(result[0].taskID).toBe(taskEID) // Critical, no deps
      expect(result[1].taskID).toBe(taskDID) // Non-critical, no deps
      expect(result[2].taskID).toBe(taskBID) // Depends on D only
      expect(result[3].taskID).toBe(taskAID) // Depends on B and E
    })

    it('should handle diamond dependency pattern with mixed critical paths', () => {
      const taskAID = newTaskID() // Top of diamond, depends on B and C
      const taskBID = newTaskID() // Left branch, critical, depends on D
      const taskCID = newTaskID() // Right branch, non-critical, depends on D
      const taskDID = newTaskID() // Bottom of diamond, critical

      const taskA: Task = {
        taskID: taskAID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskBID, taskCID],
        title: 'Task A',
        description: 'Top of diamond',
        goal: 'Complete A',
        definitionsOfDone: ['A is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskB: Task = {
        taskID: taskBID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskDID],
        title: 'Task B',
        description: 'Left branch, critical',
        goal: 'Complete B',
        definitionsOfDone: ['B is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskC: Task = {
        taskID: taskCID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskDID],
        title: 'Task C',
        description: 'Right branch, non-critical',
        goal: 'Complete C',
        definitionsOfDone: ['C is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskD: Task = {
        taskID: taskDID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task D',
        description: 'Bottom of diamond, critical',
        goal: 'Complete D',
        definitionsOfDone: ['D is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskAID, taskA)
      taskDB.set(taskBID, taskB)
      taskDB.set(taskCID, taskC)
      taskDB.set(taskDID, taskD)

      const result = taskDB.incompleteTasksInTree(taskAID)

      expect(result).toHaveLength(4)
      // Expected order: D (critical, no deps), B (critical, depends on D), C (non-critical, depends on D), A (depends on B and C)
      expect(result[0].taskID).toBe(taskDID) // Critical, no dependencies
      expect(result[1].taskID).toBe(taskBID) // Critical, depends on D
      expect(result[2].taskID).toBe(taskCID) // Non-critical, depends on D
      expect(result[3].taskID).toBe(taskAID) // Depends on both B and C
    })

    it('should handle multiple tasks with zero dependencies correctly prioritized', () => {
      const taskAID = newTaskID() // Depends on all others
      const taskBID = newTaskID() // Critical, no deps
      const taskCID = newTaskID() // Non-critical, no deps
      const taskDID = newTaskID() // Critical, no deps
      const taskEID = newTaskID() // Non-critical, no deps
      const taskFID = newTaskID() // Critical, no deps

      const taskA: Task = {
        taskID: taskAID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskBID, taskCID, taskDID, taskEID, taskFID],
        title: 'Task A',
        description: 'Depends on all',
        goal: 'Complete A',
        definitionsOfDone: ['A is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const tasks = [
        { taskID: taskBID, critical: true },
        { taskID: taskCID, critical: false },
        { taskID: taskDID, critical: true },
        { taskID: taskEID, critical: false },
        { taskID: taskFID, critical: true },
      ]

      tasks.forEach(({ taskID, critical }, index) => {
        const task: Task = {
          taskID,
          status: TodoStatus,
          dependsOnTaskIDs: [],
          title: `Task ${String.fromCharCode(66 + index)}`,
          description: `Task ${critical ? 'critical' : 'non-critical'}`,
          goal: `Complete ${String.fromCharCode(66 + index)}`,
          definitionsOfDone: [`${String.fromCharCode(66 + index)} is done`],
          criticalPath: critical,
          uncertaintyAreas: [],
          lessonsLearned: [],
          verificationEvidence: [],
        }
        taskDB.set(taskID, task)
      })

      taskDB.set(taskAID, taskA)

      const result = taskDB.incompleteTasksInTree(taskAID)

      expect(result).toHaveLength(6)

      // All critical tasks should come before non-critical tasks
      const criticalTasks = result.filter((t) => t.criticalPath && t.taskID !== taskAID)
      const nonCriticalTasksBeforeA = result.filter((t) => !t.criticalPath && t.taskID !== taskAID)

      expect(criticalTasks).toHaveLength(3) // B, D, F
      expect(nonCriticalTasksBeforeA).toHaveLength(2) // C, E

      // Verify critical tasks come first
      const criticalIndices = criticalTasks.map((t) => result.indexOf(t))
      const nonCriticalIndices = nonCriticalTasksBeforeA.map((t) => result.indexOf(t))

      expect(Math.max(...criticalIndices)).toBeLessThan(Math.min(...nonCriticalIndices))
      expect(result[result.length - 1].taskID).toBe(taskAID) // A should be last
    })

    it('should handle wide fan-out scenario', () => {
      const rootTaskID = newTaskID() // One task that many others depend on
      const dependentTaskIDs = Array.from({ length: 5 }, () => newTaskID())
      const finalTaskID = newTaskID() // Depends on all dependent tasks

      const rootTask: Task = {
        taskID: rootTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Root Task',
        description: 'Root of fan-out',
        goal: 'Complete root',
        definitionsOfDone: ['Root is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const dependentTasks = dependentTaskIDs.map(
        (taskID, index) =>
          ({
            taskID,
            status: TodoStatus,
            dependsOnTaskIDs: [rootTaskID],
            title: `Dependent Task ${index + 1}`,
            description: `Dependent task ${index + 1}`,
            goal: `Complete dependent ${index + 1}`,
            definitionsOfDone: [`Dependent ${index + 1} is done`],
            criticalPath: index % 2 === 0, // Alternate critical/non-critical
            uncertaintyAreas: [],
            lessonsLearned: [],
            verificationEvidence: [],
          } as Task)
      )

      const finalTask: Task = {
        taskID: finalTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: dependentTaskIDs,
        title: 'Final Task',
        description: 'Depends on all dependent tasks',
        goal: 'Complete final',
        definitionsOfDone: ['Final is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(rootTaskID, rootTask)
      dependentTasks.forEach((task) => taskDB.set(task.taskID, task))
      taskDB.set(finalTaskID, finalTask)

      const result = taskDB.incompleteTasksInTree(finalTaskID)

      expect(result).toHaveLength(7) // root + 5 dependents + final
      expect(result[0].taskID).toBe(rootTaskID) // Root should be first
      expect(result[result.length - 1].taskID).toBe(finalTaskID) // Final should be last

      // Critical dependent tasks should come before non-critical ones
      const dependentResults = result.slice(1, -1) // Exclude root and final
      const criticalDependents = dependentResults.filter((t) => t.criticalPath)
      const nonCriticalDependents = dependentResults.filter((t) => !t.criticalPath)

      expect(criticalDependents).toHaveLength(3)
      expect(nonCriticalDependents).toHaveLength(2)

      // Verify ordering within dependent tasks
      const dependentStartIndex = result.indexOf(result.find((t) => dependentTaskIDs.includes(t.taskID))!)
      const criticalIndicesInDependents = criticalDependents.map((t) => result.indexOf(t) - dependentStartIndex)
      const nonCriticalIndicesInDependents = nonCriticalDependents.map((t) => result.indexOf(t) - dependentStartIndex)

      expect(Math.max(...criticalIndicesInDependents)).toBeLessThan(Math.min(...nonCriticalIndicesInDependents))
    })

    it('should handle tasks with mixed complete/incomplete dependencies', () => {
      const taskAID = newTaskID() // Depends on mix of complete and incomplete
      const taskBID = newTaskID() // Complete dependency
      const taskCID = newTaskID() // Failed dependency
      const taskDID = newTaskID() // Incomplete dependency, critical
      const taskEID = newTaskID() // Incomplete dependency, non-critical

      const taskA: Task = {
        taskID: taskAID,
        status: TodoStatus,
        dependsOnTaskIDs: [taskBID, taskCID, taskDID, taskEID],
        title: 'Task A',
        description: 'Mixed dependencies',
        goal: 'Complete A',
        definitionsOfDone: ['A is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskB: Task = {
        taskID: taskBID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Task B',
        description: 'Complete task',
        goal: 'Complete B',
        definitionsOfDone: ['B is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskC: Task = {
        taskID: taskCID,
        status: FailedStatus,
        dependsOnTaskIDs: [],
        title: 'Task C',
        description: 'Failed task',
        goal: 'Complete C',
        definitionsOfDone: ['C is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskD: Task = {
        taskID: taskDID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task D',
        description: 'Incomplete critical',
        goal: 'Complete D',
        definitionsOfDone: ['D is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const taskE: Task = {
        taskID: taskEID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'Task E',
        description: 'Incomplete non-critical',
        goal: 'Complete E',
        definitionsOfDone: ['E is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(taskAID, taskA)
      taskDB.set(taskBID, taskB)
      taskDB.set(taskCID, taskC)
      taskDB.set(taskDID, taskD)
      taskDB.set(taskEID, taskE)

      const result = taskDB.incompleteTasksInTree(taskAID)

      expect(result).toHaveLength(3) // A, D, E (B and C are complete/failed)
      expect(result.map((t) => t.taskID)).toContain(taskAID)
      expect(result.map((t) => t.taskID)).toContain(taskDID)
      expect(result.map((t) => t.taskID)).toContain(taskEID)
      expect(result.map((t) => t.taskID)).not.toContain(taskBID) // done
      expect(result.map((t) => t.taskID)).not.toContain(taskCID) // failed

      // Since A only depends on incomplete tasks D and E, order should be D (critical), E (non-critical), A
      expect(result[0].taskID).toBe(taskDID) // Critical, no incomplete deps
      expect(result[1].taskID).toBe(taskEID) // Non-critical, no incomplete deps
      expect(result[2].taskID).toBe(taskAID) // Depends on D and E
    })

    it('should handle large dependency chain correctly', () => {
      const taskIDs = Array.from({ length: 10 }, () => newTaskID())
      const tasks: Task[] = []

      // Create a chain: task0 -> task1 -> task2 -> ... -> task9
      taskIDs.forEach((taskID, index) => {
        const task: Task = {
          taskID,
          status: TodoStatus,
          dependsOnTaskIDs: index > 0 ? [taskIDs[index - 1]] : [],
          title: `Task ${index}`,
          description: `Chain task ${index}`,
          goal: `Complete task ${index}`,
          definitionsOfDone: [`Task ${index} is done`],
          criticalPath: index % 3 === 0, // Every third task is critical
          uncertaintyAreas: [],
          lessonsLearned: [],
          verificationEvidence: [],
        }
        tasks.push(task)
        taskDB.set(taskID, task)
      })

      // Get result starting from the first task (which depends on the whole chain)
      const result = taskDB.incompleteTasksInTree(taskIDs[taskIDs.length - 1])

      expect(result).toHaveLength(10)

      // Verify correct order: task0 (no deps), task1 (depends on task0), ..., task9 (depends on task8)
      for (let i = 0; i < 10; i++) {
        expect(result[i].taskID).toBe(taskIDs[i])
      }
    })

    it('should handle all critical vs all non-critical tasks', () => {
      // Test with all critical tasks
      const allCriticalTaskIDs = Array.from({ length: 4 }, () => newTaskID())
      const allCriticalTasks = allCriticalTaskIDs.map(
        (taskID, index) =>
          ({
            taskID,
            status: TodoStatus,
            dependsOnTaskIDs: [],
            title: `Critical Task ${index}`,
            description: `All critical ${index}`,
            goal: `Complete critical ${index}`,
            definitionsOfDone: [`Critical ${index} is done`],
            criticalPath: true,
            uncertaintyAreas: [],
            lessonsLearned: [],
            verificationEvidence: [],
          } as Task)
      )

      const finalCriticalTaskID = newTaskID()
      const finalCriticalTask: Task = {
        taskID: finalCriticalTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: allCriticalTaskIDs,
        title: 'Final Critical',
        description: 'Depends on all critical',
        goal: 'Complete final critical',
        definitionsOfDone: ['Final critical is done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      allCriticalTasks.forEach((task) => taskDB.set(task.taskID, task))
      taskDB.set(finalCriticalTaskID, finalCriticalTask)

      const criticalResult = taskDB.incompleteTasksInTree(finalCriticalTaskID)
      expect(criticalResult).toHaveLength(5)
      expect(criticalResult.every((t) => t.criticalPath)).toBe(true)

      // Test with all non-critical tasks
      const allNonCriticalTaskIDs = Array.from({ length: 4 }, () => newTaskID())
      const allNonCriticalTasks = allNonCriticalTaskIDs.map(
        (taskID, index) =>
          ({
            taskID,
            status: TodoStatus,
            dependsOnTaskIDs: [],
            title: `Non-Critical Task ${index}`,
            description: `All non-critical ${index}`,
            goal: `Complete non-critical ${index}`,
            definitionsOfDone: [`Non-critical ${index} is done`],
            criticalPath: false,
            uncertaintyAreas: [],
            lessonsLearned: [],
            verificationEvidence: [],
          } as Task)
      )

      const finalNonCriticalTaskID = newTaskID()
      const finalNonCriticalTask: Task = {
        taskID: finalNonCriticalTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: allNonCriticalTaskIDs,
        title: 'Final Non-Critical',
        description: 'Depends on all non-critical',
        goal: 'Complete final non-critical',
        definitionsOfDone: ['Final non-critical is done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      // Create new TaskDB instance for non-critical test
      const nonCriticalTaskDB = new TaskDB()
      allNonCriticalTasks.forEach((task) => nonCriticalTaskDB.set(task.taskID, task))
      nonCriticalTaskDB.set(finalNonCriticalTaskID, finalNonCriticalTask)

      const nonCriticalResult = nonCriticalTaskDB.incompleteTasksInTree(finalNonCriticalTaskID)
      expect(nonCriticalResult).toHaveLength(5)
      expect(nonCriticalResult.every((t) => !t.criticalPath)).toBe(true)
    })
  })
})
