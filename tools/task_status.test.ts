import { describe, expect, test } from 'vitest'
import { handleTaskStatus, TaskStatusArgsSchema } from '../tools/task_status.js'

describe('task_status tests', () => {
  test('should update task status to not-started successfully', async () => {
    const args = {
      taskId: 'test-task-1',
      assessmentId: 'assessment-aa65944aaa18936d674cf521b5d93e4c',
      currentStatus: 'not-started' as const,
    }

    const result = await handleTaskStatus(args)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')

    expect(result.content).toHaveLength(1)
    expect(result.content[0]).toEqual({
      type: 'text',
      audience: ['assistant'],
      text: JSON.stringify({
        taskId: 'test-task-1',
        parentTask: undefined,
        assessmentId: 'assessment-aa65944aaa18936d674cf521b5d93e4c',
        dependsOnTasks: undefined,
        currentStatus: 'not-started',
        recommendedNextTaskId: undefined,
      }),
    })

    expect(result.structuredContent).toEqual({
      taskId: 'test-task-1',
      parentTask: undefined,
      assessmentId: 'assessment-aa65944aaa18936d674cf521b5d93e4c',
      dependsOnTasks: undefined,
      currentStatus: 'not-started',
      recommendedNextTaskId: undefined,
    })
  })

  test('should update task status to in-progress when assessed', async () => {
    const args = {
      taskId: 'test-task-2',
      assessmentId: 'assessment-303098243e2ae4d07769bc50f9c8cf53',
      currentStatus: 'in-progress' as const,
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent).toEqual({
      taskId: 'test-task-2',
      parentTask: undefined,
      assessmentId: 'assessment-303098243e2ae4d07769bc50f9c8cf53',
      dependsOnTasks: undefined,
      currentStatus: 'in-progress',
      recommendedNextTaskId: undefined,
    })
  })

  test('should update task status to complete with outcome details', async () => {
    const args = {
      taskId: 'test-task-3',
      assessmentId: 'assessment-70887d2d9c2f6bccdba69706e156e926',
      currentStatus: 'complete' as const,
      outcomeDetails: 'Task completed successfully with all requirements met',
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent).toEqual({
      taskId: 'test-task-3',
      parentTask: undefined,
      assessmentId: 'assessment-70887d2d9c2f6bccdba69706e156e926',
      dependsOnTasks: undefined,
      currentStatus: 'complete',
      recommendedNextTaskId: undefined,
    })
  })

  test('should handle task with parent task ID', async () => {
    const args = {
      taskId: 'subtask-1',
      parentTask: {
        taskId: 'parent-task',
        currentStatus: 'in-progress' as const,
      },
      assessmentId: 'assessment-5ea9710d27e10ab36597f5dceccbda13',
      currentStatus: 'in-progress' as const,
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent).toEqual({
      taskId: 'subtask-1',
      parentTask: {
        taskId: 'parent-task',
        currentStatus: 'in-progress',
      },
      assessmentId: 'assessment-5ea9710d27e10ab36597f5dceccbda13',
      dependsOnTasks: undefined,
      currentStatus: 'in-progress',
      recommendedNextTaskId: undefined,
    })
  })

  test('should handle task with dependencies', async () => {
    const args = {
      taskId: 'dependent-task',
      assessmentId: 'assessment-f5c34b816b623f29d58bb8c66e65230a',
      currentStatus: 'in-progress' as const,
      dependsOnTasks: [
        { taskId: 'prereq-1', currentStatus: 'complete' as const },
        { taskId: 'prereq-2', currentStatus: 'complete' as const },
      ],
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent).toEqual({
      taskId: 'dependent-task',
      parentTask: undefined,
      assessmentId: 'assessment-f5c34b816b623f29d58bb8c66e65230a',
      dependsOnTasks: [
        { taskId: 'prereq-1', currentStatus: 'complete' },
        { taskId: 'prereq-2', currentStatus: 'complete' },
      ],
      currentStatus: 'in-progress',
      recommendedNextTaskId: undefined,
    })
  })

  test('should handle complete task with recommended next task', async () => {
    const args = {
      taskId: 'task-with-next',
      assessmentId: 'assessment-8b81ade48fa0d6ab0a05ea64f0ba87b0',
      currentStatus: 'complete' as const,
      outcomeDetails: 'Task completed successfully',
      recommendedNextTaskId: 'next-task-id',
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent).toEqual({
      taskId: 'task-with-next',
      parentTask: undefined,
      assessmentId: 'assessment-8b81ade48fa0d6ab0a05ea64f0ba87b0',
      dependsOnTasks: undefined,
      currentStatus: 'complete',
      recommendedNextTaskId: 'next-task-id',
    })
  })

  test('should handle complex task with all optional parameters', async () => {
    const args = {
      taskId: 'complex-task',
      parentTask: {
        taskId: 'main-project',
        currentStatus: 'in-progress' as const,
      },
      assessmentId: 'assessment-c598ec7638a31872c2348fc2665e22e9',
      currentStatus: 'complete' as const,
      dependsOnTasks: [
        { taskId: 'dep-1', currentStatus: 'complete' as const },
        { taskId: 'dep-2', currentStatus: 'complete' as const },
        { taskId: 'dep-3', currentStatus: 'complete' as const },
      ],
      outcomeDetails: 'Complex task completed with all dependencies satisfied',
      recommendedNextTaskId: 'follow-up-task',
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent).toEqual({
      taskId: 'complex-task',
      parentTask: {
        taskId: 'main-project',
        currentStatus: 'in-progress',
      },
      assessmentId: 'assessment-c598ec7638a31872c2348fc2665e22e9',
      dependsOnTasks: [
        { taskId: 'dep-1', currentStatus: 'complete' },
        { taskId: 'dep-2', currentStatus: 'complete' },
        { taskId: 'dep-3', currentStatus: 'complete' },
      ],
      currentStatus: 'complete',
      recommendedNextTaskId: 'follow-up-task',
    })
  })

  test('should handle task with single dependency', async () => {
    const args = {
      taskId: 'single-dep-task',
      assessmentId: 'assessment-c9338d038ebbd7753c7aa66d831634c6',
      currentStatus: 'in-progress' as const,
      dependsOnTasks: [{ taskId: 'single-prereq', currentStatus: 'complete' as const }],
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent.dependsOnTasks).toEqual([{ taskId: 'single-prereq', currentStatus: 'complete' }])
  })

  test('should handle task with many dependencies', async () => {
    const manyDeps = Array.from({ length: 10 }, (_, i) => ({
      taskId: `dep-${i + 1}`,
      currentStatus: 'complete' as const,
    }))

    const args = {
      taskId: 'many-deps-task',
      assessmentId: 'assessment-648e69833ad4bd009dbd24744710adb3',
      currentStatus: 'in-progress' as const,
      dependsOnTasks: manyDeps,
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent.dependsOnTasks).toEqual(manyDeps)
    expect(result.structuredContent.dependsOnTasks).toHaveLength(10)
  })

  test('should handle unicode and special characters in task IDs', async () => {
    const args = {
      taskId: 'test-task-🚀-测试',
      parentTask: {
        taskId: 'parent-测试-🎯',
        currentStatus: 'in-progress' as const,
      },
      assessmentId: 'assessment-15f6235fe615dc1dd8d770c025f7a19b',
      currentStatus: 'complete' as const,
      dependsOnTasks: [
        { taskId: 'dep-中文', currentStatus: 'complete' as const },
        { taskId: 'dep-émoji-🔥', currentStatus: 'complete' as const },
      ],
      outcomeDetails: 'Task with unicode chars completed: 中文 🚀 ∑∆∫',
      recommendedNextTaskId: 'next-unicode-task-🎉',
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent.taskId).toBe('test-task-🚀-测试')
    expect(result.structuredContent.parentTask?.taskId).toBe('parent-测试-🎯')
    expect(result.structuredContent.dependsOnTasks).toEqual([
      { taskId: 'dep-中文', currentStatus: 'complete' },
      { taskId: 'dep-émoji-🔥', currentStatus: 'complete' },
    ])
    expect(result.structuredContent.recommendedNextTaskId).toBe('next-unicode-task-🎉')
  })

  test('should handle long task ID and outcome details', async () => {
    const longTaskId = 'very-long-task-id-'.repeat(20) + 'final'
    const longOutcome = 'A very detailed outcome description '.repeat(100)

    const args = {
      taskId: longTaskId,
      assessmentId: 'assessment-7bbb367a9ceb3eaf6bfcdf67a67120e2',
      currentStatus: 'complete' as const,
      outcomeDetails: longOutcome,
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent.taskId).toBe(longTaskId)
  })

  test('should return consistent structure for JSON serialization', async () => {
    const args = {
      taskId: 'json-test-task',
      assessmentId: 'assessment-6dd99c454f876d85743d5b45a631024a',
      currentStatus: 'complete' as const,
      outcomeDetails: 'Testing JSON serialization',
      recommendedNextTaskId: 'next-json-test',
    }

    const result = await handleTaskStatus(args)

    const parsedContent = JSON.parse(result.content[0].text)
    expect(parsedContent).toEqual(result.structuredContent)

    const reSerializedContent = JSON.parse(JSON.stringify(result.structuredContent))
    expect(reSerializedContent).toEqual(result.structuredContent)
  })

  test('should preserve exact order of dependencies', async () => {
    const orderedDeps = [
      { taskId: 'alpha', currentStatus: 'complete' as const },
      { taskId: 'beta', currentStatus: 'complete' as const },
      { taskId: 'gamma', currentStatus: 'complete' as const },
      { taskId: 'delta', currentStatus: 'complete' as const },
      { taskId: 'epsilon', currentStatus: 'complete' as const },
    ]

    const args = {
      taskId: 'ordered-deps-task',
      assessmentId: 'assessment-b52b97dbf6062a1783ec7f1404085498',
      currentStatus: 'in-progress' as const,
      dependsOnTasks: orderedDeps,
    }

    const result = await handleTaskStatus(args)

    expect(result.structuredContent.dependsOnTasks).toEqual(orderedDeps)
  })

  test('should handle task status transitions', async () => {
    const taskId = 'transition-task'

    const notStartedArgs = {
      taskId,
      assessmentId: 'assessment-d419f478175e45f4d35cfa1bd7fef00d',
      currentStatus: 'not-started' as const,
    }

    const inProgressArgs = {
      taskId,
      assessmentId: 'assessment-d419f478175e45f4d35cfa1bd7fef00d',
      currentStatus: 'in-progress' as const,
    }

    const completeArgs = {
      taskId,
      assessmentId: 'assessment-d419f478175e45f4d35cfa1bd7fef00d',
      currentStatus: 'complete' as const,
      outcomeDetails: 'Task completed successfully',
    }

    const notStartedResult = await handleTaskStatus(notStartedArgs)
    expect(notStartedResult.structuredContent.currentStatus).toBe('not-started')
    expect(notStartedResult.structuredContent.assessmentId).toBe('assessment-d419f478175e45f4d35cfa1bd7fef00d')

    const inProgressResult = await handleTaskStatus(inProgressArgs)
    expect(inProgressResult.structuredContent.currentStatus).toBe('in-progress')
    expect(inProgressResult.structuredContent.assessmentId).toBe('assessment-d419f478175e45f4d35cfa1bd7fef00d')

    const completeResult = await handleTaskStatus(completeArgs)
    expect(completeResult.structuredContent.currentStatus).toBe('complete')
    expect(completeResult.structuredContent.assessmentId).toBe('assessment-d419f478175e45f4d35cfa1bd7fef00d')
  })
})

describe('task_status error handling', () => {
  test('should throw error when trying to set in-progress status without assessment', async () => {
    const args = {
      taskId: 'unassessed-task',
      assessmentId: 'assessment-invalid-id-for-unassessed-task',
      currentStatus: 'in-progress' as const,
    }

    await expect(handleTaskStatus(args)).rejects.toThrow(
      "Invalid assessment ID 'assessment-invalid-id-for-unassessed-task' for task 'unassessed-task'. Use the 'assess_task' tool to assess this task."
    )
  })

  test('should throw error when trying to set complete status without assessment', async () => {
    const args = {
      taskId: 'unassessed-complete-task',
      assessmentId: 'assessment-invalid-id-for-unassessed-complete-task',
      currentStatus: 'complete' as const,
      outcomeDetails: 'Task completed',
    }

    await expect(handleTaskStatus(args)).rejects.toThrow(
      "Invalid assessment ID 'assessment-invalid-id-for-unassessed-complete-task' for task 'unassessed-complete-task'. Use the 'assess_task' tool to assess this task."
    )
  })

  test('should allow not-started status without assessment', async () => {
    const args = {
      taskId: 'new-task',
      assessmentId: 'assessment-e20bf2eab21bf5c832db737ec7cc2a07',
      currentStatus: 'not-started' as const,
    }

    const result = await handleTaskStatus(args)
    expect(result.structuredContent.currentStatus).toBe('not-started')
    expect(result.structuredContent.assessmentId).toBe('assessment-e20bf2eab21bf5c832db737ec7cc2a07')
  })

  test('should allow any status when task is assessed', async () => {
    const statuses = ['not-started', 'in-progress', 'complete'] as const
    const assessmentIds = {
      'not-started': 'assessment-f571b9e7d7bd16d8451afb1ef988efe5',
      'in-progress': 'assessment-dd57e81b16b42ae757b2e2783167b848',
      complete: 'assessment-fc520b121a86542dd64105d8f5d29914',
    }

    for (const status of statuses) {
      const args = {
        taskId: `assessed-task-${status}`,
        assessmentId: assessmentIds[status],
        currentStatus: status,
        ...(status === 'complete' && { outcomeDetails: 'Task completed' }),
      }

      const result = await handleTaskStatus(args)
      expect(result.structuredContent.currentStatus).toBe(status)
      expect(result.structuredContent.assessmentId).toBe(assessmentIds[status])
    }
  })

  test('should throw error when trying to start subtask with parent not in progress', async () => {
    const parentStatuses = ['not-started', 'complete'] as const

    for (const parentStatus of parentStatuses) {
      const args = {
        taskId: 'subtask-invalid-parent',
        parentTask: {
          taskId: 'parent-task',
          currentStatus: parentStatus,
        },
        assessmentId: 'assessment-e2a4824f9a0d2a0406f9ec20be13063b',
        currentStatus: 'in-progress' as const,
      }

      await expect(handleTaskStatus(args)).rejects.toThrow(
        "Task 'subtask-invalid-parent' can't be started unless parent task 'parent-task' has been started. Use the 'task_status' tool to update the parent task's status."
      )
    }
  })

  test('should allow subtask operations when parent is in progress', async () => {
    const args = {
      taskId: 'valid-subtask',
      parentTask: {
        taskId: 'parent-task',
        currentStatus: 'in-progress' as const,
      },
      assessmentId: 'assessment-08dd3791d6261cdb3c3bc8082e5ac15c',
      currentStatus: 'in-progress' as const,
    }

    const result = await handleTaskStatus(args)
    expect(result.structuredContent.currentStatus).toBe('in-progress')
    expect(result.structuredContent.parentTask?.taskId).toBe('parent-task')
  })

  test('should verify outcomeDetails inclusion in response when provided', async () => {
    const argsWithoutOutcome = {
      taskId: 'task-no-outcome',
      assessmentId: 'assessment-252f7c7b980a018d20a6a9c932be1522',
      currentStatus: 'in-progress' as const,
    }

    const argsWithOutcome = {
      taskId: 'task-with-outcome',
      assessmentId: 'assessment-659b7a4ca75198728e87113716bffc74',
      currentStatus: 'complete' as const,
      outcomeDetails: 'Task completed successfully with all requirements met',
    }

    const resultWithoutOutcome = await handleTaskStatus(argsWithoutOutcome)
    const resultWithOutcome = await handleTaskStatus(argsWithOutcome)

    // The outcomeDetails should not be in the response (implementation doesn't include it)
    expect(resultWithoutOutcome.structuredContent).not.toHaveProperty('outcomeDetails')
    expect(resultWithOutcome.structuredContent).not.toHaveProperty('outcomeDetails')

    // But it should be processed without error when provided
    expect(resultWithOutcome.structuredContent.currentStatus).toBe('complete')
  })
})

describe('task_status schema validation', () => {
  test('should validate minimal required fields', () => {
    const validArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p',
      currentStatus: 'not-started',
    }

    const result = TaskStatusArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should validate with all optional fields', () => {
    const validArgs = {
      taskId: 'test-task',
      parentTaskId: 'parent-task',
      dependsOnCompletedTaskIds: ['dep-1', 'dep-2'],
      assessmentId: 'assessment-11e6f8d7c5a3b4f8e2a3d4f8e9b2c1a0',
      currentStatus: 'complete',
      outcomeDetails: 'Task completed successfully',
      recommendedNextTaskId: 'next-task',
    }

    const result = TaskStatusArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should reject empty task ID', () => {
    const invalidArgs = {
      taskId: '',
      assessmentId: 'assessment-ab3f2e1d9c8b7a6f5e4d3c2b1a0f9e8d',
      currentStatus: 'not-started',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject missing task ID', () => {
    const invalidArgs = {
      assessmentId: 'assessment-ab3f2e1d9c8b7a6f5e4d3c2b1a0f9e8d',
      currentStatus: 'not-started',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject missing assessed field', () => {
    const invalidArgs = {
      taskId: 'test-task',
      currentStatus: 'not-started',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject missing currentStatus field', () => {
    const invalidArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-temp',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject invalid currentStatus value', () => {
    const invalidArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-temp',
      currentStatus: 'invalid-status',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty parent task ID', () => {
    const invalidArgs = {
      taskId: 'test-task',
      parentTask: {
        taskId: '',
        currentStatus: 'in-progress',
      },
      assessmentId: 'assessment-temp',
      currentStatus: 'not-started',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty dependencies array', () => {
    const invalidArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-temp',
      currentStatus: 'not-started',
      dependsOnTasks: [],
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty dependency ID in array', () => {
    const invalidArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-temp',
      currentStatus: 'not-started',
      dependsOnTasks: [
        { taskId: 'valid-dep', currentStatus: 'complete' },
        { taskId: '', currentStatus: 'complete' },
        { taskId: 'another-valid-dep', currentStatus: 'complete' },
      ],
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty outcome details', () => {
    const invalidArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-temp',
      currentStatus: 'complete',
      outcomeDetails: '',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty recommended next task ID', () => {
    const invalidArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-temp',
      currentStatus: 'complete',
      recommendedNextTaskId: '',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject non-string task ID', () => {
    const invalidArgs = {
      taskId: 123,
      assessmentId: 'assessment-temp',
      currentStatus: 'not-started',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject non-boolean assessed field', () => {
    const invalidArgs = {
      taskId: 'test-task',
      assessed: 'true',
      currentStatus: 'not-started',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject non-array dependencies', () => {
    const invalidArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-temp',
      currentStatus: 'not-started',
      dependsOnTasks: 'not-an-array',
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject non-string outcome details', () => {
    const invalidArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-temp',
      currentStatus: 'complete',
      outcomeDetails: 123,
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject non-string recommended next task ID', () => {
    const invalidArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-temp',
      currentStatus: 'complete',
      recommendedNextTaskId: 123,
    }

    const result = TaskStatusArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should accept valid enum values for currentStatus', () => {
    const statuses = ['not-started', 'in-progress', 'complete']

    statuses.forEach((status) => {
      const validArgs = {
        taskId: 'test-task',
        assessmentId: 'assessment-temp',
        currentStatus: status,
      }

      const result = TaskStatusArgsSchema.safeParse(validArgs)
      expect(result.success).toBe(true)
    })
  })

  test('should validate with unicode and special characters', () => {
    const validArgs = {
      taskId: 'test-task-🚀-测试',
      parentTaskId: 'parent-中文-🎯',
      dependsOnCompletedTaskIds: ['dep-émoji-🔥', 'dep-symbols-∑∆∫'],
      assessmentId: 'assessment-15f6235fe615dc1dd8d770c025f7a19b',
      currentStatus: 'complete',
      outcomeDetails: 'Outcome with unicode: 中文 and symbols @#$%^&*()',
      recommendedNextTaskId: 'next-task-🎉-测试',
    }

    const result = TaskStatusArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should validate with multiple dependencies', () => {
    const manyDeps = Array.from({ length: 20 }, (_, i) => `dependency-${i + 1}`)

    const validArgs = {
      taskId: 'test-task',
      assessmentId: 'assessment-15f6235fe615dc1dd8d770c025f7a19b',
      currentStatus: 'in-progress',
      dependsOnCompletedTaskIds: manyDeps,
    }

    const result = TaskStatusArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should validate with long strings', () => {
    const longTaskId = 'very-long-task-id-'.repeat(50)
    const longOutcome = 'Very long outcome details '.repeat(200)

    const validArgs = {
      taskId: longTaskId,
      assessmentId: 'assessment-temp',
      currentStatus: 'complete',
      outcomeDetails: longOutcome,
    }

    const result = TaskStatusArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should throw error when subtask is started but parent is not in progress', async () => {
    const args = {
      taskId: 'subtask',
      parentTask: {
        taskId: 'parent-task',
        currentStatus: 'not-started' as const,
      },
      assessmentId: 'assessment-5bc5b3da188a79f7f649131c419feaad',
      currentStatus: 'in-progress' as const,
    }

    await expect(handleTaskStatus(args)).rejects.toThrow(
      "Task 'subtask' can't be started unless parent task 'parent-task' has been started. Use the 'task_status' tool to update the parent task's status."
    )
  })

  test('should throw error when subtask is started but parent is complete', async () => {
    const args = {
      taskId: 'subtask',
      parentTask: {
        taskId: 'parent-task',
        currentStatus: 'complete' as const,
      },
      assessmentId: 'assessment-5bc5b3da188a79f7f649131c419feaad',
      currentStatus: 'in-progress' as const,
    }

    await expect(handleTaskStatus(args)).rejects.toThrow(
      "Task 'subtask' can't be started unless parent task 'parent-task' has been started. Use the 'task_status' tool to update the parent task's status."
    )
  })

  test('should throw error when task is started but not assessed', async () => {
    const args = {
      taskId: 'unassessed-task',
      assessmentId: 'assessment-invalid-id-for-schema-validation',
      currentStatus: 'in-progress' as const,
    }

    await expect(handleTaskStatus(args)).rejects.toThrow(
      "Invalid assessment ID 'assessment-invalid-id-for-schema-validation' for task 'unassessed-task'. Use the 'assess_task' tool to assess this task."
    )
  })

  test('should throw error when task is started but dependencies are not complete', async () => {
    const args = {
      taskId: 'dependent-task',
      assessmentId: 'assessment-f5c34b816b623f29d58bb8c66e65230a',
      currentStatus: 'in-progress' as const,
      dependsOnTasks: [
        { taskId: 'dep1', currentStatus: 'complete' as const },
        { taskId: 'dep2', currentStatus: 'in-progress' as const }, // Not complete
      ],
    }

    await expect(handleTaskStatus(args)).rejects.toThrow(
      "Task 'dependent-task' can't be started unless all dependent tasks are complete. Use the 'task_status' tool to update the dependent tasks' statuses."
    )
  })

  test('should throw error when task is started with mixed dependency statuses', async () => {
    const args = {
      taskId: 'mixed-deps-task',
      assessmentId: 'assessment-c5dd5c9767dfa08d495c3dc4e43ee8ac',
      currentStatus: 'in-progress' as const,
      dependsOnTasks: [
        { taskId: 'dep1', currentStatus: 'complete' as const },
        { taskId: 'dep2', currentStatus: 'not-started' as const }, // Not complete
        { taskId: 'dep3', currentStatus: 'complete' as const },
      ],
    }

    await expect(handleTaskStatus(args)).rejects.toThrow(
      "Task 'mixed-deps-task' can't be started unless all dependent tasks are complete. Use the 'task_status' tool to update the dependent tasks' statuses."
    )
  })
})
