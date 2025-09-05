import { beforeEach, describe, expect, it } from 'vitest'
import { TaskDB } from '../task_db.js'
import { TodoStatus, type Task } from '../tasks.js'
import { handleCreateTask } from './create_task.js'

describe('create_task tool handler', () => {
  let taskDB: TaskDB

  beforeEach(() => {
    taskDB = new TaskDB()
  })

  describe('basic task creation', () => {
    it('should create a simple task with trivial complexity', async () => {
      const args = {
        title: 'Test task',
        description: 'A test task description',
        goal: 'Test goal',
        definitionsOfDone: ['Task is complete'],
        criticalPath: true,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'trivial' as const,
          description: 'Simple task',
        },
      }

      const result = await handleCreateTask(args, taskDB, false)

      expect(result.structuredContent).toMatchObject({
        taskCreated: {
          taskID: expect.any(String),
          title: 'Test task',
          mustDecomposeBeforeExecution: undefined,
        },
      })
      expect(result.content).toHaveLength(1)

      // Verify task was stored in database
      const taskID = result.structuredContent.taskCreated.taskID
      const storedTask = taskDB.get(taskID)
      expect(storedTask).toBeDefined()
      expect(storedTask?.title).toBe('Test task')
      expect(storedTask?.status).toBe(TodoStatus)
    })

    it('should create task with low complexity', async () => {
      const args = {
        title: 'Test task',
        description: 'A test task description',
        goal: 'Test goal',
        definitionsOfDone: ['Task is complete'],
        criticalPath: false,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'low, may benefit from decomposition before execution' as const,
          description: 'Low complexity task',
        },
      }

      const result = await handleCreateTask(args, taskDB, false)

      expect(result.structuredContent.taskCreated.mustDecomposeBeforeExecution).toBeUndefined()
      expect(result.content).toHaveLength(1)
    })

    it('should indicate decomposition needed for medium complexity', async () => {
      const args = {
        title: 'Complex task',
        description: 'A complex task description',
        goal: 'Complex goal',
        definitionsOfDone: ['Complex task is complete'],
        criticalPath: true,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'medium, must decompose before execution' as const,
          description: 'Medium complexity task',
        },
      }

      const result = await handleCreateTask(args, taskDB, false)

      expect(result.structuredContent.taskCreated.mustDecomposeBeforeExecution).toBe(true)
      expect(result.content).toHaveLength(2)
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: "Task must be decomposed before execution, use 'decompose_task' tool",
        audience: ['assistant'],
      })
    })

    it('should indicate decomposition needed for high complexity', async () => {
      const args = {
        title: 'Very complex task',
        description: 'A very complex task description',
        goal: 'Very complex goal',
        definitionsOfDone: ['Very complex task is complete'],
        criticalPath: true,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'high, must decompose before execution' as const,
          description: 'High complexity task',
        },
      }

      const result = await handleCreateTask(args, taskDB, false)

      expect(result.structuredContent.taskCreated.mustDecomposeBeforeExecution).toBe(true)
      expect(result.content).toHaveLength(2)
      expect(result.content[0]).toMatchObject({
        text: "Task must be decomposed before execution, use 'decompose_task' tool",
      })
    })

    it('should handle task with uncertainty areas', async () => {
      const args = {
        title: 'Uncertain task',
        description: 'A task with uncertainties',
        goal: 'Uncertain goal',
        definitionsOfDone: ['Task is complete'],
        criticalPath: false,
        uncertaintyAreas: [
          {
            title: 'Unknown requirement',
            description: 'Not sure about this requirement',
          },
          {
            title: 'Technical challenge',
            description: 'Need to research this approach',
          },
        ],
        estimatedComplexity: {
          level: 'trivial' as const,
          description: 'Simple but uncertain task',
        },
      }

      const result = await handleCreateTask(args, taskDB, false)

      const taskID = result.structuredContent.taskCreated.taskID
      const storedTask = taskDB.get(taskID)
      expect(storedTask?.uncertaintyAreas).toHaveLength(2)
      expect(storedTask?.uncertaintyAreas[0]).toMatchObject({
        title: 'Unknown requirement',
        description: 'Not sure about this requirement',
      })
    })
  })

  describe('single agent mode', () => {
    it('should set current task in single agent mode', async () => {
      const args = {
        title: 'Current task',
        description: 'Task for single agent',
        goal: 'Single agent goal',
        definitionsOfDone: ['Single agent task complete'],
        criticalPath: true,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'trivial' as const,
          description: 'Simple current task',
        },
      }

      const result = await handleCreateTask(args, taskDB, true)

      const taskID = result.structuredContent.taskCreated.taskID
      expect(taskDB.getCurrentTask()).toBe(taskID)
    })

    it('should not set current task in multi-agent mode', async () => {
      const args = {
        title: 'Multi-agent task',
        description: 'Task for multiple agents',
        goal: 'Multi-agent goal',
        definitionsOfDone: ['Multi-agent task complete'],
        criticalPath: true,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'trivial' as const,
          description: 'Simple multi-agent task',
        },
      }

      await handleCreateTask(args, taskDB, false)

      expect(taskDB.getCurrentTask()).toBeNull()
    })
  })

  describe('task properties validation', () => {
    it('should create task with all required properties', async () => {
      const args = {
        title: 'Complete task',
        description: 'Complete task description',
        goal: 'Complete goal',
        definitionsOfDone: ['First criterion', 'Second criterion'],
        criticalPath: true,
        uncertaintyAreas: [
          {
            title: 'Uncertainty',
            description: 'Some uncertainty',
          },
        ],
        estimatedComplexity: {
          level: 'low, may benefit from decomposition before execution' as const,
          description: 'Low complexity with details',
        },
      }

      const result = await handleCreateTask(args, taskDB, false)

      const taskID = result.structuredContent.taskCreated.taskID
      const storedTask = taskDB.get(taskID) as Task

      expect(storedTask).toMatchObject({
        taskID: taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Complete task',
        description: 'Complete task description',
        goal: 'Complete goal',
        definitionsOfDone: ['First criterion', 'Second criterion'],
        criticalPath: true,
        uncertaintyAreas: [
          {
            title: 'Uncertainty',
            description: 'Some uncertainty',
          },
        ],
        estimatedComplexity: {
          level: 'low, may benefit from decomposition before execution',
          description: 'Low complexity with details',
        },
        lessonsLearned: [],
        verificationEvidence: [],
      })
    })

    it('should handle empty definitions of done and uncertainty areas', async () => {
      const args = {
        title: 'Minimal task',
        description: 'Minimal task description',
        goal: 'Minimal goal',
        definitionsOfDone: ['One requirement'],
        criticalPath: false,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'trivial' as const,
          description: 'Minimal complexity',
        },
      }

      const result = await handleCreateTask(args, taskDB, false)

      const taskID = result.structuredContent.taskCreated.taskID
      const storedTask = taskDB.get(taskID)

      expect(storedTask?.uncertaintyAreas).toEqual([])
      expect(storedTask?.definitionsOfDone).toEqual(['One requirement'])
    })
  })

  describe('task ID generation', () => {
    it('should generate unique task IDs', async () => {
      const args = {
        title: 'ID test task',
        description: 'Testing unique IDs',
        goal: 'Unique ID goal',
        definitionsOfDone: ['ID is unique'],
        criticalPath: false,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'trivial' as const,
          description: 'ID generation test',
        },
      }

      const result1 = await handleCreateTask(args, taskDB, false)
      const result2 = await handleCreateTask(args, taskDB, false)

      const taskID1 = result1.structuredContent.taskCreated.taskID
      const taskID2 = result2.structuredContent.taskCreated.taskID

      expect(taskID1).not.toBe(taskID2)
      expect(taskID1).toMatch(/^[a-zA-Z0-9].*[a-zA-Z0-9]$/)
      expect(taskID2).toMatch(/^[a-zA-Z0-9].*[a-zA-Z0-9]$/)
    })
  })
})
