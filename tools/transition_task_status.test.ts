import { describe, expect, it } from 'vitest'
import { TaskIDSchema, TaskStatusSchema } from './tasks.js'
import { handleTransitionTaskStatus } from './transition_task_status.js'

describe('transition_task_status handler', () => {
  it('should transition from not-started to in-progress', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: TaskStatusSchema.parse('not-started'),
        newStatus: TaskStatusSchema.parse('in-progress'),
      },
      uncertaintyAreasRemaining: false,
    }

    const result = await handleTransitionTaskStatus(args)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')
    expect(result.content[1].text).toContain('not-started -> in-progress')
  })

  it('should transition from in-progress to complete with outcome details', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: TaskStatusSchema.parse('in-progress'),
        newStatus: TaskStatusSchema.parse('complete'),
      },
      uncertaintyAreasRemaining: false,
      outcomeDetails: 'Task completed successfully',
    }

    const result = await handleTransitionTaskStatus(args)

    expect(result.content[1].text).toContain('in-progress -> complete')
  })

  it('should include recommended next task when completing', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const recommendedNextTaskID = TaskIDSchema.parse('next-task-456')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: TaskStatusSchema.parse('in-progress'),
        newStatus: TaskStatusSchema.parse('complete'),
      },
      uncertaintyAreasRemaining: false,
      outcomeDetails: 'Task completed successfully',
      recommendedNextTaskID,
    }

    const result = await handleTransitionTaskStatus(args)

    expect(result.structuredContent.recommendedNextTaskID).toBe(recommendedNextTaskID)
    expect(result.content[1].text).toContain('Recommended task to perform next: next-task-456')
  })

  it('should throw error when uncertainty areas remain', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: TaskStatusSchema.parse('not-started'),
        newStatus: TaskStatusSchema.parse('in-progress'),
      },
      uncertaintyAreasRemaining: true,
    }

    await expect(handleTransitionTaskStatus(args)).rejects.toThrow(
      'Use available tools as appropriate to research all required information'
    )
  })

  it('should throw error for invalid transition', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: TaskStatusSchema.parse('not-started'),
        newStatus: TaskStatusSchema.parse('complete'),
      },
      uncertaintyAreasRemaining: false,
    }

    await expect(handleTransitionTaskStatus(args)).rejects.toThrow('Invalid status transition')
  })

  it('should throw error when parent task is not in progress', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const parentTaskID = TaskIDSchema.parse('parent123')
    const args = {
      taskID,
      title: 'Test Task',
      parentTask: {
        taskID: parentTaskID,
        currentStatus: TaskStatusSchema.parse('not-started'),
      },
      transition: {
        oldStatus: TaskStatusSchema.parse('not-started'),
        newStatus: TaskStatusSchema.parse('in-progress'),
      },
      uncertaintyAreasRemaining: false,
    }

    await expect(handleTransitionTaskStatus(args)).rejects.toThrow("parent task 'parent123' must be started first")
  })

  it('should throw error when dependent task is not complete', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const depTaskID = TaskIDSchema.parse('dep123')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: TaskStatusSchema.parse('not-started'),
        newStatus: TaskStatusSchema.parse('in-progress'),
      },
      dependsOnTasks: [
        {
          taskID: depTaskID,
          currentStatus: TaskStatusSchema.parse('in-progress'),
        },
      ],
      uncertaintyAreasRemaining: false,
    }

    await expect(handleTransitionTaskStatus(args)).rejects.toThrow("dependent task 'dep123' is not complete")
  })

  it('should throw error when completing without outcome details', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: TaskStatusSchema.parse('in-progress'),
        newStatus: TaskStatusSchema.parse('complete'),
      },
      uncertaintyAreasRemaining: false,
    }

    await expect(handleTransitionTaskStatus(args)).rejects.toThrow('must provide outcomeDetails to complete task')
  })

  it('should allow transition from complete back to in-progress', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: TaskStatusSchema.parse('complete'),
        newStatus: TaskStatusSchema.parse('in-progress'),
      },
      uncertaintyAreasRemaining: false,
    }

    const result = await handleTransitionTaskStatus(args)

    expect(result.content[1].text).toContain('complete -> in-progress')
  })

  it('should handle successful transition with parent and dependencies', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const parentTaskID = TaskIDSchema.parse('parent123')
    const depTaskID = TaskIDSchema.parse('dep123')
    const args = {
      taskID,
      title: 'Test Task',
      parentTask: {
        taskID: parentTaskID,
        currentStatus: TaskStatusSchema.parse('in-progress'),
      },
      transition: {
        oldStatus: TaskStatusSchema.parse('not-started'),
        newStatus: TaskStatusSchema.parse('in-progress'),
      },
      dependsOnTasks: [
        {
          taskID: depTaskID,
          currentStatus: TaskStatusSchema.parse('complete'),
        },
      ],
      uncertaintyAreasRemaining: false,
    }

    const result = await handleTransitionTaskStatus(args)

    expect(result.content[1].text).toContain('not-started -> in-progress')
  })

  it('should throw error for invalid old status', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: 'invalid-status' as any,
        newStatus: TaskStatusSchema.parse('in-progress'),
      },
      uncertaintyAreasRemaining: false,
    }

    await expect(handleTransitionTaskStatus(args)).rejects.toThrow('Invalid old status for task')
  })

  it('should throw error for invalid transition from in-progress', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: TaskStatusSchema.parse('in-progress'),
        newStatus: TaskStatusSchema.parse('not-started'),
      },
      uncertaintyAreasRemaining: false,
    }

    await expect(handleTransitionTaskStatus(args)).rejects.toThrow('Invalid status transition')
  })

  it('should throw error for invalid transition from complete', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const args = {
      taskID,
      title: 'Test Task',
      transition: {
        oldStatus: TaskStatusSchema.parse('complete'),
        newStatus: TaskStatusSchema.parse('complete'),
      },
      uncertaintyAreasRemaining: false,
    }

    await expect(handleTransitionTaskStatus(args)).rejects.toThrow('Invalid status transition')
  })
})
