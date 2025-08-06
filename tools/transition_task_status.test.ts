import { describe, expect, it } from 'vitest'
import { TaskDB } from './task_db.js'
import { TaskIDSchema, TaskStatusSchema } from './tasks.js'
import { handleTransitionTaskStatus } from './transition_task_status.js'

describe('transition_task_status handler', () => {
  it('should transition from not-started to in-progress', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')
    expect(result.content[0].text).toContain('task123')
    expect(result.content[0].text).toContain('in-progress')
  })

  it('should transition from in-progress to complete with outcome details', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'in-progress' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
      outcomeDetails: 'Task completed successfully',
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result.content[0].text).toContain('task123')
    expect(result.content[0].text).toContain('complete')
  })

  it('should include recommended next task when completing', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')
    const recommendedNextTaskID = TaskIDSchema.parse('next-task-456')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'in-progress' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
      outcomeDetails: 'Task completed successfully',
      recommendedNextTaskID,
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result.structuredContent.recommendedNextTaskID).toBe(recommendedNextTaskID)
    expect(result.content[0].text).toContain('next-task-456')
  })

  it('should throw error when uncertainty areas remain', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create the task with unresolved uncertainty areas
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [
        {
          uncertaintyAreaID: 'area1' as any,
          description: 'Unresolved area',
          status: 'unresolved' as any,
        },
      ],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Must resolve uncertainty area')
  })

  it('should throw error for invalid transition', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Invalid status transition')
  })

  it('should throw error when parent task is not in progress', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')
    const parentTaskID = TaskIDSchema.parse('parent123')

    // Create parent task in not-started status
    taskDB.set(parentTaskID, {
      taskID: parentTaskID,
      currentStatus: 'not-started' as any,
      title: 'Parent Task',
      description: 'Parent description',
      goal: 'Parent goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create child task
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      parentTaskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      "Parent task 'parent123' must be 'in-progress' first"
    )
  })

  it('should throw error when dependent task is not complete', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')
    const depTaskID = TaskIDSchema.parse('dep123')

    // Create dependent task in in-progress status
    taskDB.set(depTaskID, {
      taskID: depTaskID,
      currentStatus: 'in-progress' as any,
      title: 'Dependent Task',
      description: 'Dependent description',
      goal: 'Dependent goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create the task with dependency
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [depTaskID],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      "Invalid status transition: Dependent task 'dep123' must be 'complete' first"
    )
  })

  it('should throw error when completing without outcome details', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'in-progress' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      'Must provide outcomeDetails to complete task'
    )
  })

  it('should allow transition from complete back to in-progress', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'complete' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result.content[0].text).toContain('task123')
    expect(result.content[0].text).toContain('in-progress')
  })

  it('should handle successful transition with parent and dependencies', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')
    const parentTaskID = TaskIDSchema.parse('parent123')
    const depTaskID = TaskIDSchema.parse('dep123')

    // Create parent task in in-progress status
    taskDB.set(parentTaskID, {
      taskID: parentTaskID,
      currentStatus: 'in-progress' as any,
      title: 'Parent Task',
      description: 'Parent description',
      goal: 'Parent goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create dependent task in complete status
    taskDB.set(depTaskID, {
      taskID: depTaskID,
      currentStatus: 'complete' as any,
      title: 'Dependent Task',
      description: 'Dependent description',
      goal: 'Dependent goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create the task with parent and dependency
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      parentTaskID,
      dependentTaskIDs: [depTaskID],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    const result = await handleTransitionTaskStatus(args, taskDB)

    expect(result.content[0].text).toContain('task123')
    expect(result.content[0].text).toContain('in-progress')
  })

  it('should throw error for invalid old status', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create the task with invalid status
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'invalid-status' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Invalid current status')
  })

  it('should throw error for invalid transition from in-progress', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'in-progress' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('not-started'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Invalid status transition')
  })

  it('should throw error for invalid transition from complete', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create the task first
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'complete' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Invalid status transition')
  })

  // Additional edge case tests for comprehensive coverage

  it('should throw error for non-existent task', async () => {
    const taskDB = new TaskDB()
    const nonExistentTaskID = TaskIDSchema.parse('non-existent-task')

    const args = {
      taskID: nonExistentTaskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      `Invalid task update: Unknown task ID: ${nonExistentTaskID}`
    )
  })

  it('should throw error when subtasks are not complete during parent completion', async () => {
    const taskDB = new TaskDB()
    const parentTaskID = TaskIDSchema.parse('parent123')
    const subtaskID = TaskIDSchema.parse('subtask123')

    // Create parent task in in-progress status
    taskDB.set(parentTaskID, {
      taskID: parentTaskID,
      currentStatus: 'in-progress' as any,
      title: 'Parent Task',
      description: 'Parent description',
      goal: 'Parent goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create subtask that is not complete
    taskDB.set(subtaskID, {
      taskID: subtaskID,
      currentStatus: 'in-progress' as any,
      title: 'Subtask',
      description: 'Subtask description',
      goal: 'Subtask goal',
      parentTaskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID: parentTaskID,
      newStatus: TaskStatusSchema.parse('complete'),
      outcomeDetails: 'Attempting to complete parent',
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      `Invalid status transition: Subtask '${subtaskID}' must be 'complete' first`
    )
  })

  it('should throw error with multiple unresolved uncertainty areas', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    // Create task with multiple unresolved uncertainty areas
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [
        {
          uncertaintyAreaID: 'area1' as any,
          description: 'First unresolved area',
          status: 'unresolved' as any,
        },
        {
          uncertaintyAreaID: 'area2' as any,
          description: 'Second unresolved area',
          status: 'unresolved' as any,
        },
      ],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    // Should fail on the first unresolved area found
    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Must resolve uncertainty area')
  })

  it('should throw error with multiple incomplete dependent tasks', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')
    const depTask1ID = TaskIDSchema.parse('dep1')
    const depTask2ID = TaskIDSchema.parse('dep2')

    // Create first dependent task (complete)
    taskDB.set(depTask1ID, {
      taskID: depTask1ID,
      currentStatus: 'complete' as any,
      title: 'First Dependent Task',
      description: 'First dep description',
      goal: 'First dep goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create second dependent task (not complete)
    taskDB.set(depTask2ID, {
      taskID: depTask2ID,
      currentStatus: 'in-progress' as any,
      title: 'Second Dependent Task',
      description: 'Second dep description',
      goal: 'Second dep goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create main task with both dependencies
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [depTask1ID, depTask2ID],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    // Should fail on the first incomplete dependency found
    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      `Invalid status transition: Dependent task '${depTask2ID}' must be 'complete' first`
    )
  })

  it('should throw error for same status transition (not-started to not-started)', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('not-started'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow('Invalid status transition')
  })

  it('should handle outcome details provided for non-complete transition', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
      outcomeDetails: 'This should be ignored',
    }

    // Should succeed but ignore the outcome details
    const result = await handleTransitionTaskStatus(args, taskDB)
    expect(result.content[0].text).toContain('task123')
    expect(result.content[0].text).toContain('in-progress')
  })

  it('should throw error for empty outcome details when completing', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'in-progress' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('complete'),
      outcomeDetails: '', // Empty string should be treated as missing
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      'Must provide outcomeDetails to complete task'
    )
  })

  it('should clear recommendedNextTaskID for non-complete transitions', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')

    taskDB.set(taskID, {
      taskID,
      currentStatus: 'complete' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
      recommendedNextTaskID: TaskIDSchema.parse('next-task'),
    }

    const result = await handleTransitionTaskStatus(args, taskDB)
    expect(result.structuredContent.recommendedNextTaskID).toBeUndefined()
  })

  it('should handle multiple subtasks blocking parent completion', async () => {
    const taskDB = new TaskDB()
    const parentTaskID = TaskIDSchema.parse('parent123')
    const subtask1ID = TaskIDSchema.parse('subtask1')
    const subtask2ID = TaskIDSchema.parse('subtask2')

    // Create parent task
    taskDB.set(parentTaskID, {
      taskID: parentTaskID,
      currentStatus: 'in-progress' as any,
      title: 'Parent Task',
      description: 'Parent description',
      goal: 'Parent goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create first subtask (complete)
    taskDB.set(subtask1ID, {
      taskID: subtask1ID,
      currentStatus: 'complete' as any,
      title: 'First Subtask',
      description: 'First subtask description',
      goal: 'First subtask goal',
      parentTaskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create second subtask (not complete)
    taskDB.set(subtask2ID, {
      taskID: subtask2ID,
      currentStatus: 'in-progress' as any,
      title: 'Second Subtask',
      description: 'Second subtask description',
      goal: 'Second subtask goal',
      parentTaskID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID: parentTaskID,
      newStatus: TaskStatusSchema.parse('complete'),
      outcomeDetails: 'Attempting to complete parent',
    }

    // Should fail on the first incomplete subtask found
    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      `Invalid status transition: Subtask '${subtask2ID}' must be 'complete' first`
    )
  })

  it('should handle deeply nested task hierarchy validation', async () => {
    const taskDB = new TaskDB()
    const grandparentID = TaskIDSchema.parse('grandparent')
    const parentID = TaskIDSchema.parse('parent')
    const childID = TaskIDSchema.parse('child')

    // Create grandparent task (not-started)
    taskDB.set(grandparentID, {
      taskID: grandparentID,
      currentStatus: 'not-started' as any,
      title: 'Grandparent Task',
      description: 'Grandparent description',
      goal: 'Grandparent goal',
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create parent task
    taskDB.set(parentID, {
      taskID: parentID,
      currentStatus: 'not-started' as any,
      title: 'Parent Task',
      description: 'Parent description',
      goal: 'Parent goal',
      parentTaskID: grandparentID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Create child task
    taskDB.set(childID, {
      taskID: childID,
      currentStatus: 'not-started' as any,
      title: 'Child Task',
      description: 'Child description',
      goal: 'Child goal',
      parentTaskID: parentID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    // Try to start child task while parent is not in-progress
    const args = {
      taskID: childID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow(
      `Invalid status transition: Parent task '${parentID}' must be 'in-progress' first`
    )
  })

  it('should throw error when referenced parent task is missing from database', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')
    const missingParentID = TaskIDSchema.parse('missing-parent')

    // Create child task with reference to non-existent parent
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Child Task',
      description: 'Child description',
      goal: 'Child goal',
      parentTaskID: missingParentID,
      dependentTaskIDs: [],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    // This should throw a runtime error due to the non-null assertion in the implementation
    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow()
  })

  it('should throw error when referenced dependent task is missing from database', async () => {
    const taskDB = new TaskDB()
    const taskID = TaskIDSchema.parse('task123')
    const missingDepID = TaskIDSchema.parse('missing-dep')

    // Create task with reference to non-existent dependency
    taskDB.set(taskID, {
      taskID,
      currentStatus: 'not-started' as any,
      title: 'Test Task',
      description: 'Test description',
      goal: 'Test goal',
      dependentTaskIDs: [missingDepID],
      uncertaintyAreas: [],
    })

    const args = {
      taskID,
      newStatus: TaskStatusSchema.parse('in-progress'),
    }

    // This should throw a runtime error due to the non-null assertion in the implementation
    await expect(handleTransitionTaskStatus(args, taskDB)).rejects.toThrow()
  })
})
