import { describe, expect, it } from 'vitest'
import { handleCreateTask } from './create_task.js'
import { TaskDB } from './task_db.js'
import { handleTaskInfo } from './task_info.js'
import { TaskIDSchema, TaskStatusSchema } from './tasks.js'
import { handleTransitionTaskStatus } from './transition_task_status.js'

describe('task_info handler', () => {
  it('should return full task info for existing task', async () => {
    const taskDB = new TaskDB()
    const createResult = await handleCreateTask(
      {
        title: 'Info Task',
        description: 'Task for info retrieval',
        goal: 'Goal',
        definitionsOfDone: ['Info DoD'],
        dependsOnTaskIDs: [],
        uncertaintyAreas: [{ title: 'Clarify', description: 'Need clarification' }],
      },
      taskDB
    )

    const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

    const infoResult = await handleTaskInfo({ taskID }, taskDB)

    expect(infoResult.structuredContent.task.taskID).toBe(taskID)
    expect(infoResult.structuredContent.task.title).toBe('Info Task')
    expect(infoResult.structuredContent.task.description).toBe('Task for info retrieval')
    expect(infoResult.structuredContent.task.goal).toBe('Goal')
    // Task shape does not include embedded uncertainty areas; just basic fields
    expect(infoResult.structuredContent.task).toMatchObject({
      taskID,
      title: 'Info Task',
      description: 'Task for info retrieval',
      goal: 'Goal',
      definitionsOfDone: ['Info DoD'],
    })
  })

  it('should throw error for unknown task ID', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('unknown-task')

    await expect(handleTaskInfo({ taskID }, taskDB)).rejects.toThrow(
      `Invalid task info request: Unknown task ID: ${taskID}`
    )
  })

  describe('single agent mode', () => {
    it('should return current in-progress task when no taskID provided in single agent mode', async () => {
      const taskDB = new TaskDB(true) // Enable single agent mode
      const createResult = await handleCreateTask(
        {
          title: 'Single Agent Task',
          description: 'Task for single agent mode',
          goal: 'Goal',
          definitionsOfDone: ['Single Agent DoD'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      // Transition to in-progress
      await handleTransitionTaskStatus({ taskID, newStatus: TaskStatusSchema.parse('in-progress') }, taskDB)

      // Now call task_info without taskID - should return current in-progress task
      const infoResult = await handleTaskInfo({}, taskDB)

      expect(infoResult.structuredContent.task.taskID).toBe(taskID)
      expect(infoResult.structuredContent.task.title).toBe('Single Agent Task')
      expect(infoResult.structuredContent.task.currentStatus).toBe('in-progress')
    })

    it('should throw error when no taskID provided and no current in-progress task in single agent mode', async () => {
      const taskDB = new TaskDB(true) // Enable single agent mode

      await expect(handleTaskInfo({}, taskDB)).rejects.toThrow('No task currently in progress.')
    })

    it('should still work with explicit taskID in single agent mode', async () => {
      const taskDB = new TaskDB(true) // Enable single agent mode
      const createResult = await handleCreateTask(
        {
          title: 'Explicit ID Task',
          description: 'Task with explicit ID',
          goal: 'Goal',
          definitionsOfDone: ['Explicit DoD'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      const infoResult = await handleTaskInfo({ taskID }, taskDB)

      expect(infoResult.structuredContent.task.taskID).toBe(taskID)
      expect(infoResult.structuredContent.task.title).toBe('Explicit ID Task')
    })

    it('should update current task when transitioning task status', async () => {
      const taskDB = new TaskDB(true) // Enable single agent mode
      const createResult = await handleCreateTask(
        {
          title: 'Status Transition Task',
          description: 'Task for status transition',
          goal: 'Goal',
          definitionsOfDone: ['Transition DoD'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      // Initially no current task
      expect(taskDB.getCurrentInProgressTask()).toBeUndefined()

      // Transition to in-progress
      await handleTransitionTaskStatus({ taskID, newStatus: TaskStatusSchema.parse('in-progress') }, taskDB)
      expect(taskDB.getCurrentInProgressTask()).toBe(taskID)

      // Complete the task
      await handleTransitionTaskStatus(
        {
          taskID,
          newStatus: TaskStatusSchema.parse('complete'),
          outcomeDetails: ['Task completed'],
          verificationEvidence: ['Evidence provided'],
        },
        taskDB
      )
      expect(taskDB.getCurrentInProgressTask()).toBeUndefined()
    })

    it('should throw error for non-existent task in single agent mode', async () => {
      const taskDB = new TaskDB(true) // Enable single agent mode
      const taskID = TaskIDSchema.parse('non-existent-task')

      await expect(handleTaskInfo({ taskID }, taskDB)).rejects.toThrow(
        `Invalid task info request: Unknown task ID: ${taskID}. Use 'task_info' tool without taskID to retrieve details on current 'in-progress' task.`
      )
    })

    it('should throw error when no taskID provided in normal mode', async () => {
      const taskDB = new TaskDB()

      await expect(handleTaskInfo({}, taskDB)).rejects.toThrow('Invalid task info request: Unknown task ID: undefined')
    })
  })

  describe('executionConstraints', () => {
    it('should include readonly constraint for in-progress readonly task', async () => {
      const taskDB = new TaskDB()
      const createResult = await handleCreateTask(
        {
          title: 'Readonly Task',
          description: 'Task that is readonly',
          goal: 'Test readonly goal',
          definitionsOfDone: ['Readonly DoD'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      // Mark task as readonly and transition to in-progress
      const task = taskDB.get(taskID)!
      task.readonly = true
      task.uncertaintyAreasUpdated = true
      taskDB.set(taskID, task)

      await handleTransitionTaskStatus({ taskID, newStatus: TaskStatusSchema.parse('in-progress') }, taskDB)

      const infoResult = await handleTaskInfo({ taskID }, taskDB)

      expect(infoResult.structuredContent.executionConstraints).toContain(
        `IMPORTANT: Task '${taskID}' is read-only: This task must be performed without making any permanent changes, editing code or any other content is not allowed.`
      )
    })

    it('should include dependency constraint when task has incomplete dependencies', async () => {
      const taskDB = new TaskDB()

      // Create a dependency task that's not complete
      const depResult = await handleCreateTask(
        {
          title: 'Dependency Task',
          description: 'Dependency that is not complete',
          goal: 'Dependency goal',
          definitionsOfDone: ['Dep DoD'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )
      const depTaskID = depResult.structuredContent.tasksCreated.at(-1)!.taskID

      // Create main task with dependency
      const createResult = await handleCreateTask(
        {
          title: 'Main Task',
          description: 'Task with dependency',
          goal: 'Main goal',
          definitionsOfDone: ['Main DoD'],
          dependsOnTaskIDs: [depTaskID],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      const infoResult = await handleTaskInfo({ taskID }, taskDB)

      expect(infoResult.structuredContent.executionConstraints).toContain(
        `Dependencies of task '${taskID}' must be 'complete' first before this task can be 'in-progress'.`
      )
    })

    it('should include definitions of done constraint for in-progress task with definitions', async () => {
      const taskDB = new TaskDB()
      const createResult = await handleCreateTask(
        {
          title: 'Task with DoD',
          description: 'Task with definitions of done',
          goal: 'Test goal with definitions',
          definitionsOfDone: ['Definition 1', 'Definition 2'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      // Transition to in-progress
      await handleTransitionTaskStatus({ taskID, newStatus: TaskStatusSchema.parse('in-progress') }, taskDB)

      const infoResult = await handleTaskInfo({ taskID }, taskDB)

      expect(infoResult.structuredContent.executionConstraints).toContain(
        `Definitions of done for task '${taskID}' must be met before this task can be considered 'complete'.`
      )
    })

    it('should include multiple constraints when applicable', async () => {
      const taskDB = new TaskDB()

      // Create incomplete dependency
      const depResult = await handleCreateTask(
        {
          title: 'Incomplete Dependency',
          description: 'Dependency task',
          goal: 'Dependency goal',
          definitionsOfDone: ['Dep DoD'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )
      const depTaskID = depResult.structuredContent.tasksCreated.at(-1)!.taskID

      // Create readonly task with dependency and definitions
      const createResult = await handleCreateTask(
        {
          title: 'Complex Task',
          description: 'Readonly task with dependency and definitions',
          goal: 'Complex goal',
          definitionsOfDone: ['Complex DoD'],
          dependsOnTaskIDs: [depTaskID],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      // Mark task as readonly and set uncertainty areas updated
      const task = taskDB.get(taskID)!
      task.readonly = true
      task.uncertaintyAreasUpdated = true
      taskDB.set(taskID, task)

      // Transition to in-progress
      await handleTransitionTaskStatus({ taskID, newStatus: TaskStatusSchema.parse('in-progress') }, taskDB)

      const infoResult = await handleTaskInfo({ taskID }, taskDB)

      expect(infoResult.structuredContent.executionConstraints).toHaveLength(2)
      expect(infoResult.structuredContent.executionConstraints).toContain(
        `IMPORTANT: Task '${taskID}' is read-only: This task must be performed without making any permanent changes, editing code or any other content is not allowed.`
      )
      expect(infoResult.structuredContent.executionConstraints).toContain(
        `Definitions of done for task '${taskID}' must be met before this task can be considered 'complete'.`
      )
    })

    it('should not include executionConstraints when there are no constraints', async () => {
      const taskDB = new TaskDB()
      const createResult = await handleCreateTask(
        {
          title: 'Simple Task',
          description: 'Simple task without constraints',
          goal: 'Simple goal',
          definitionsOfDone: [],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      const infoResult = await handleTaskInfo({ taskID }, taskDB)

      expect(infoResult.structuredContent.executionConstraints).toBeUndefined()
    })

    it('should not include readonly constraint for readonly task that is not in-progress', async () => {
      const taskDB = new TaskDB()
      const createResult = await handleCreateTask(
        {
          title: 'Readonly Not Started',
          description: 'Readonly task that is not started',
          goal: 'Readonly goal',
          definitionsOfDone: ['Readonly DoD'],
          dependsOnTaskIDs: [],
          uncertaintyAreas: [],
        },
        taskDB
      )

      const taskID = createResult.structuredContent.tasksCreated.at(-1)!.taskID

      // Mark task as readonly but keep it not-started
      const task = taskDB.get(taskID)!
      task.readonly = true
      taskDB.set(taskID, task)

      const infoResult = await handleTaskInfo({ taskID }, taskDB)

      // Should not have readonly constraint since task is not in-progress
      const constraints = infoResult.structuredContent.executionConstraints || []
      const hasReadonlyConstraint = constraints.some((c) => typeof c === 'string' && c.includes('read-only'))
      expect(hasReadonlyConstraint).toBe(false)
    })
  })
})
