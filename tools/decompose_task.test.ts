import { beforeEach, describe, expect, it } from 'vitest'
import { TaskDB } from '../task_db.js'
import { DoneStatus, InProgressStatus, newTaskID, TodoStatus, type Task } from '../tasks.js'
import { handleDecomposeTask } from './decompose_task.js'

describe('decompose_task tool handler', () => {
  let taskDB: TaskDB

  beforeEach(() => {
    taskDB = new TaskDB()
  })

  describe('basic task decomposition', () => {
    it('should decompose task into subtasks with sequence ordering', async () => {
      // Create parent task
      const parentTaskID = newTaskID()
      const parentTask: Task = {
        taskID: parentTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Parent Task',
        description: 'Task to be decomposed',
        goal: 'Parent goal',
        definitionsOfDone: ['Parent done'],
        criticalPath: true,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'medium, must decompose before execution',
          description: 'Needs decomposition',
        },
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(parentTaskID, parentTask)

      const args = {
        taskID: parentTaskID,
        decompositionReason: 'Task is too complex',
        subtasks: [
          {
            title: 'Subtask 1',
            description: 'First subtask',
            goal: 'First goal',
            definitionsOfDone: ['First done'],
            criticalPath: true,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Simple subtask',
            },
            sequenceOrder: 1,
          },
          {
            title: 'Subtask 2',
            description: 'Second subtask',
            goal: 'Second goal',
            definitionsOfDone: ['Second done'],
            criticalPath: false,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'low, may benefit from decomposition before execution' as const,
              description: 'Low complexity subtask',
            },
            sequenceOrder: 2,
          },
        ],
      }

      const result = await handleDecomposeTask(args, taskDB, false)

      expect(result.structuredContent).toMatchObject({
        taskUpdated: {
          taskID: parentTaskID,
          title: 'Parent Task',
        },
        tasksCreated: expect.arrayContaining([
          expect.objectContaining({
            title: 'Subtask 1',
            mustDecomposeBeforeExecution: undefined,
          }),
          expect.objectContaining({
            title: 'Subtask 2',
            mustDecomposeBeforeExecution: undefined,
          }),
        ]),
      })

      // Verify parent task now depends on the last sequence subtasks
      const updatedParent = taskDB.get(parentTaskID)!
      expect(updatedParent.dependsOnTaskIDs).toHaveLength(1)

      // Verify subtasks were created with proper dependencies
      const createdTaskIDs = result.structuredContent.tasksCreated.map((t: any) => t.taskID)
      expect(createdTaskIDs).toHaveLength(2)

      const subtask1 = taskDB.get(createdTaskIDs[0])!
      const subtask2 = taskDB.get(createdTaskIDs[1])!

      // First subtask should have no dependencies
      expect(subtask1.dependsOnTaskIDs).toHaveLength(0)

      // Second subtask should depend on first subtask
      expect(subtask2.dependsOnTaskIDs).toContain(subtask1.taskID)
    })

    it('should handle parallel subtasks with same sequence order', async () => {
      const parentTaskID = newTaskID()
      const parentTask: Task = {
        taskID: parentTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Parallel Parent',
        description: 'Task with parallel subtasks',
        goal: 'Parallel goal',
        definitionsOfDone: ['Parallel done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(parentTaskID, parentTask)

      const args = {
        taskID: parentTaskID,
        decompositionReason: 'Can be done in parallel',
        subtasks: [
          {
            title: 'Parallel Task A',
            description: 'First parallel task',
            goal: 'Parallel A goal',
            definitionsOfDone: ['A done'],
            criticalPath: true,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Simple parallel task',
            },
            sequenceOrder: 1,
          },
          {
            title: 'Parallel Task B',
            description: 'Second parallel task',
            goal: 'Parallel B goal',
            definitionsOfDone: ['B done'],
            criticalPath: true,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Simple parallel task',
            },
            sequenceOrder: 1,
          },
        ],
      }

      const result = await handleDecomposeTask(args, taskDB, false)

      const createdTaskIDs = result.structuredContent.tasksCreated.map((t: any) => t.taskID)
      const taskA = taskDB.get(createdTaskIDs[0])!
      const taskB = taskDB.get(createdTaskIDs[1])!

      // Both tasks should have no dependencies (parallel execution)
      expect(taskA.dependsOnTaskIDs).toHaveLength(0)
      expect(taskB.dependsOnTaskIDs).toHaveLength(0)

      // Parent should depend on both tasks
      const updatedParent = taskDB.get(parentTaskID)!
      expect(updatedParent.dependsOnTaskIDs).toHaveLength(2)
      expect(updatedParent.dependsOnTaskIDs).toContain(taskA.taskID)
      expect(updatedParent.dependsOnTaskIDs).toContain(taskB.taskID)
    })

    it('should create complex dependency chains', async () => {
      const parentTaskID = newTaskID()
      const parentTask: Task = {
        taskID: parentTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Complex Parent',
        description: 'Complex decomposition',
        goal: 'Complex goal',
        definitionsOfDone: ['Complex done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(parentTaskID, parentTask)

      const args = {
        taskID: parentTaskID,
        decompositionReason: 'Complex workflow',
        subtasks: [
          {
            title: 'Setup',
            description: 'Initial setup',
            goal: 'Setup complete',
            definitionsOfDone: ['Setup done'],
            criticalPath: true,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Setup task',
            },
            sequenceOrder: 1,
          },
          {
            title: 'Process A',
            description: 'First process',
            goal: 'Process A complete',
            definitionsOfDone: ['A processed'],
            criticalPath: true,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Process task',
            },
            sequenceOrder: 2,
          },
          {
            title: 'Process B',
            description: 'Second process',
            goal: 'Process B complete',
            definitionsOfDone: ['B processed'],
            criticalPath: false,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Process task',
            },
            sequenceOrder: 2,
          },
          {
            title: 'Finalize',
            description: 'Final step',
            goal: 'Finalization complete',
            definitionsOfDone: ['Finalized'],
            criticalPath: true,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Final task',
            },
            sequenceOrder: 3,
          },
        ],
      }

      const result = await handleDecomposeTask(args, taskDB, false)

      const createdTasks = result.structuredContent.tasksCreated
      const setupTask = createdTasks.find((t: any) => t.title === 'Setup')!
      const processATask = createdTasks.find((t: any) => t.title === 'Process A')!
      const processBTask = createdTasks.find((t: any) => t.title === 'Process B')!
      const finalizeTask = createdTasks.find((t: any) => t.title === 'Finalize')!

      const setup = taskDB.get(setupTask.taskID)!
      const processA = taskDB.get(processATask.taskID)!
      const processB = taskDB.get(processBTask.taskID)!
      const finalize = taskDB.get(finalizeTask.taskID)!

      // Setup has no dependencies
      expect(setup.dependsOnTaskIDs).toHaveLength(0)

      // Both processes depend on setup
      expect(processA.dependsOnTaskIDs).toContain(setup.taskID)
      expect(processB.dependsOnTaskIDs).toContain(setup.taskID)

      // Finalize depends on both processes
      expect(finalize.dependsOnTaskIDs).toContain(processA.taskID)
      expect(finalize.dependsOnTaskIDs).toContain(processB.taskID)

      // Parent depends on finalize
      const updatedParent = taskDB.get(parentTaskID)!
      expect(updatedParent.dependsOnTaskIDs).toContain(finalize.taskID)
    })
  })

  describe('error handling', () => {
    it('should throw error for non-existent parent task', async () => {
      const nonExistentID = newTaskID()
      const args = {
        taskID: nonExistentID,
        decompositionReason: 'Testing error',
        subtasks: [
          {
            title: 'Test Subtask',
            description: 'Test description',
            goal: 'Test goal',
            definitionsOfDone: ['Test done'],
            criticalPath: false,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Test',
            },
            sequenceOrder: 1,
          },
        ],
      }

      await expect(handleDecomposeTask(args, taskDB, false)).rejects.toThrow(`Task not found: ${nonExistentID}`)
    })

    it('should throw error when trying to decompose non-todo task', async () => {
      const parentTaskID = newTaskID()
      const parentTask: Task = {
        taskID: parentTaskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'In Progress Task',
        description: 'Cannot be decomposed',
        goal: 'Should fail',
        definitionsOfDone: ['Will not work'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(parentTaskID, parentTask)

      const args = {
        taskID: parentTaskID,
        decompositionReason: 'Should fail',
        subtasks: [
          {
            title: 'Should Not Work',
            description: 'This should fail',
            goal: 'Failure',
            definitionsOfDone: ['Failed'],
            criticalPath: false,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Should fail',
            },
            sequenceOrder: 1,
          },
        ],
      }

      await expect(handleDecomposeTask(args, taskDB, false)).rejects.toThrow(
        `Can't decompose task ${parentTaskID} in status: in-progress`
      )
    })

    it('should throw error when trying to decompose done task', async () => {
      const parentTaskID = newTaskID()
      const parentTask: Task = {
        taskID: parentTaskID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Done Task',
        description: 'Already completed',
        goal: 'Completed',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(parentTaskID, parentTask)

      const args = {
        taskID: parentTaskID,
        decompositionReason: 'Should fail',
        subtasks: [
          {
            title: 'Should Not Work',
            description: 'This should fail',
            goal: 'Failure',
            definitionsOfDone: ['Failed'],
            criticalPath: false,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Should fail',
            },
            sequenceOrder: 1,
          },
        ],
      }

      await expect(handleDecomposeTask(args, taskDB, false)).rejects.toThrow(
        `Can't decompose task ${parentTaskID} in status: done`
      )
    })
  })

  describe('content messages', () => {
    it('should return empty content when no subtasks need decomposition', async () => {
      const parentTaskID = newTaskID()
      const parentTask: Task = {
        taskID: parentTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Simple Parent',
        description: 'Simple decomposition',
        goal: 'Simple goal',
        definitionsOfDone: ['Simple done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(parentTaskID, parentTask)

      const args = {
        taskID: parentTaskID,
        decompositionReason: 'Simple breakdown',
        subtasks: [
          {
            title: 'Simple Subtask',
            description: 'Simple subtask',
            goal: 'Simple subtask goal',
            definitionsOfDone: ['Simple subtask done'],
            criticalPath: false,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Simple',
            },
            sequenceOrder: 1,
          },
        ],
      }

      const result = await handleDecomposeTask(args, taskDB, false)
      expect(result.content).toEqual([])
    })

    it('should indicate when some subtasks need decomposition', async () => {
      const parentTaskID = newTaskID()
      const parentTask: Task = {
        taskID: parentTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Mixed Parent',
        description: 'Mixed complexity',
        goal: 'Mixed goal',
        definitionsOfDone: ['Mixed done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(parentTaskID, parentTask)

      const args = {
        taskID: parentTaskID,
        decompositionReason: 'Mixed complexity',
        subtasks: [
          {
            title: 'Simple Subtask',
            description: 'Simple subtask',
            goal: 'Simple goal',
            definitionsOfDone: ['Simple done'],
            criticalPath: false,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'Simple',
            },
            sequenceOrder: 1,
          },
          {
            title: 'Complex Subtask',
            description: 'Complex subtask',
            goal: 'Complex goal',
            definitionsOfDone: ['Complex done'],
            criticalPath: true,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'medium, must decompose before execution' as const,
              description: 'Complex',
            },
            sequenceOrder: 2,
          },
        ],
      }

      const result = await handleDecomposeTask(args, taskDB, false)

      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: 'Some tasks must be decomposed before execution',
        audience: ['assistant'],
      })
    })
  })

  describe('existing dependencies preservation', () => {
    it('should preserve existing parent task dependencies', async () => {
      const existingDepID = newTaskID()
      const existingDep: Task = {
        taskID: existingDepID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Existing Dependency',
        description: 'Already exists',
        goal: 'Existing goal',
        definitionsOfDone: ['Existing done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(existingDepID, existingDep)

      const parentTaskID = newTaskID()
      const parentTask: Task = {
        taskID: parentTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [existingDepID], // Existing dependency
        title: 'Parent with Dependencies',
        description: 'Has existing deps',
        goal: 'Preserve deps',
        definitionsOfDone: ['Deps preserved'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(parentTaskID, parentTask)

      const args = {
        taskID: parentTaskID,
        decompositionReason: 'Add more subtasks',
        subtasks: [
          {
            title: 'New Subtask',
            description: 'New subtask',
            goal: 'New goal',
            definitionsOfDone: ['New done'],
            criticalPath: true,
            uncertaintyAreas: [],
            estimatedComplexity: {
              level: 'trivial' as const,
              description: 'New task',
            },
            sequenceOrder: 1,
          },
        ],
      }

      const result = await handleDecomposeTask(args, taskDB, false)

      const updatedParent = taskDB.get(parentTaskID)!
      const newSubtaskID = result.structuredContent.tasksCreated[0].taskID

      // Should have both existing and new dependencies
      expect(updatedParent.dependsOnTaskIDs).toContain(existingDepID)
      expect(updatedParent.dependsOnTaskIDs).toContain(newSubtaskID)
      expect(updatedParent.dependsOnTaskIDs).toHaveLength(2)
    })
  })
})
