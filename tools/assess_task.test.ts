import { describe, expect, test } from 'vitest'
import { AssessTaskArgsSchema, handleAssessTask } from '../tools/assess_task.js'

describe('assess_task tests', () => {
  test('should assess a simple task without subtasks', async () => {
    const args = {
      taskId: 'simple-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'This is a simple task that can be performed all at once.',
    }

    const result = await handleAssessTask(args)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')

    expect(result.content).toHaveLength(1)
    expect(result.content[0]).toEqual({
      type: 'text',
      audience: ['assistant'],
      text: JSON.stringify({
        assessmentId: 'assessment-2c2c4842f9ad59fa39a54d224a3b194d',
        taskId: 'simple-task',
        parentTaskId: undefined,
        tasksNeedingRegistration: undefined,
      }),
    })

    expect(result.structuredContent).toEqual({
      assessmentId: 'assessment-2c2c4842f9ad59fa39a54d224a3b194d',
      taskId: 'simple-task',
      parentTaskId: undefined,
      tasksNeedingRegistration: undefined,
    })
  })

  test('should assess a complex task with subtasks', async () => {
    const args = {
      taskId: 'complex-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'This is a complex task that requires multiple discrete subtasks.',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'subtask-1',
          title: 'First Subtask',
          description: 'This is the first subtask',
          goal: 'Complete the first part of the work',
        },
        {
          taskId: 'subtask-2',
          title: 'Second Subtask',
          description: 'This is the second subtask',
          goal: 'Complete the second part of the work',
        },
      ],
    }

    const result = await handleAssessTask(args)

    expect(result.content).toHaveLength(1)
    expect(result.content[0]).toEqual({
      type: 'text',
      audience: ['assistant'],
      text: JSON.stringify({
        assessmentId: 'assessment-c598ec7638a31872c2348fc2665e22e9',
        taskId: 'complex-task',
        parentTaskId: undefined,
        tasksNeedingRegistration: [
          { taskId: 'subtask-1', parentTaskId: 'complex-task', dependsOnCompletedTaskIds: undefined },
          { taskId: 'subtask-2', parentTaskId: 'complex-task', dependsOnCompletedTaskIds: undefined },
        ],
      }),
    })

    expect(result.structuredContent).toEqual({
      assessmentId: 'assessment-c598ec7638a31872c2348fc2665e22e9',
      taskId: 'complex-task',
      parentTaskId: undefined,
      tasksNeedingRegistration: [
        { taskId: 'subtask-1', parentTaskId: 'complex-task', dependsOnCompletedTaskIds: undefined },
        { taskId: 'subtask-2', parentTaskId: 'complex-task', dependsOnCompletedTaskIds: undefined },
      ],
    })
  })

  test('should assess task with single subtask', async () => {
    const args = {
      taskId: 'task-with-one-subtask',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'This task has one subtask.',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'only-subtask',
          title: 'The Only Subtask',
          description: 'This is the only subtask needed',
          goal: 'Complete the work',
        },
      ],
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent).toEqual({
      assessmentId: 'assessment-1a31c5be6b1db9b71fe4050c9edc15cb',
      taskId: 'task-with-one-subtask',
      parentTaskId: undefined,
      tasksNeedingRegistration: [
        {
          taskId: 'only-subtask',
          parentTaskId: 'task-with-one-subtask',
          dependsOnCompletedTaskIds: undefined,
        },
      ],
    })
  })

  test('should assess a task with a parent task', async () => {
    const args = {
      taskId: 'child-task',
      parentTaskId: 'parent-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'This is a child task.',
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent).toEqual({
      assessmentId: 'assessment-dadc231ef4cd3d1495a01767a9ef0fdc',
      taskId: 'child-task',
      parentTaskId: 'parent-task',
      tasksNeedingRegistration: undefined,
    })
  })

  test('should assess a complex task with subtasks and a parent task', async () => {
    const args = {
      taskId: 'complex-child-task',
      parentTaskId: 'parent-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'This is a complex child task.',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'subtask-1',
          title: 'First Subtask',
          description: 'This is the first subtask',
          goal: 'Complete the first part of the work',
        },
      ],
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent).toEqual({
      assessmentId: 'assessment-c79d4575a0378964eb41f122196e8891',
      taskId: 'complex-child-task',
      parentTaskId: 'parent-task',
      tasksNeedingRegistration: [
        {
          taskId: 'subtask-1',
          parentTaskId: 'complex-child-task',
          dependsOnCompletedTaskIds: undefined,
        },
      ],
    })
  })

  test('should assess task with many subtasks', async () => {
    const subtasks = Array.from({ length: 5 }, (_, i) => ({
      taskId: `subtask-${i + 1}`,
      title: `Subtask ${i + 1}`,
      description: `Description for subtask ${i + 1}`,
      goal: `Goal for subtask ${i + 1}`,
    }))

    const args = {
      taskId: 'task-with-many-subtasks',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'This task requires multiple subtasks to complete.',
      complexityAssessmentOutcomeSubtasks: subtasks,
    }

    const result = await handleAssessTask(args)

    const expectedRegistrations = subtasks.map((subtask) => ({
      taskId: subtask.taskId,
      parentTaskId: 'task-with-many-subtasks',
      dependsOnCompletedTaskIds: undefined,
    }))

    expect(result.structuredContent).toEqual({
      assessmentId: 'assessment-02c82eda25bad6a7d9ad16d6bb5f658e',
      taskId: 'task-with-many-subtasks',
      parentTaskId: undefined,
      tasksNeedingRegistration: expectedRegistrations,
    })
  })

  test('should handle special characters in assessment text', async () => {
    const args = {
      taskId: 'special-chars-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'This task has "quotes", <brackets>, {braces}, & symbols!',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'special-subtask',
          title: 'Subtask with "quotes"',
          description: 'Description with symbols: @#$%^&*()[]{}',
          goal: 'Handle special characters properly',
        },
      ],
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent.assessmentId).toBe('assessment-32fd44f96f94ce803301c258dcf1fb07')
    expect(result.structuredContent.taskId).toBe('special-chars-task')
    expect(result.structuredContent.parentTaskId).toBeUndefined()
    expect(result.structuredContent.tasksNeedingRegistration).toHaveLength(1)
    expect(result.structuredContent.tasksNeedingRegistration?.[0]).toEqual({
      taskId: 'special-subtask',
      parentTaskId: 'special-chars-task',
      dependsOnCompletedTaskIds: undefined,
    })
  })

  test('should handle unicode characters', async () => {
    const args = {
      taskId: 'unicode-task-测试',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Unicode assessment: 中文, émojis 🚀, symbols ∑∆∫',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'unicode-subtask-🎯',
          title: 'Unicode Subtask 🎯',
          description: 'Description with unicode: 中文测试',
          goal: 'Test unicode support properly',
        },
      ],
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent.taskId).toBe('unicode-task-测试')
    expect(result.structuredContent.tasksNeedingRegistration?.[0]).toEqual({
      taskId: 'unicode-subtask-🎯',
      parentTaskId: 'unicode-task-测试',
    })
  })

  test('should handle long assessment text and subtasks', async () => {
    const longAssessment = 'This is a very long complexity assessment '.repeat(50)
    const longDescription = 'A very long description '.repeat(100)
    const longTitle = 'Long Title '.repeat(20)
    const longGoal = 'Long goal description '.repeat(30)

    const args = {
      taskId: 'long-content-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: longAssessment,
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'long-subtask',
          title: longTitle,
          description: longDescription,
          goal: longGoal,
        },
      ],
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent.taskId).toBe('long-content-task')
    expect(result.structuredContent.tasksNeedingRegistration).toHaveLength(1)
    expect(result.structuredContent.tasksNeedingRegistration?.[0]).toEqual({
      taskId: 'long-subtask',
      parentTaskId: 'long-content-task',
    })
  })

  test('should preserve exact order of subtasks', async () => {
    const orderedSubtasks = [
      { taskId: 'alpha', title: 'Alpha', description: 'First', goal: 'A' },
      { taskId: 'beta', title: 'Beta', description: 'Second', goal: 'B' },
      { taskId: 'gamma', title: 'Gamma', description: 'Third', goal: 'C' },
      { taskId: 'delta', title: 'Delta', description: 'Fourth', goal: 'D' },
    ]

    const args = {
      taskId: 'ordered-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Task with ordered subtasks',
      complexityAssessmentOutcomeSubtasks: orderedSubtasks,
    }

    const result = await handleAssessTask(args)

    const expectedOrder = orderedSubtasks.map((subtask) => ({
      taskId: subtask.taskId,
      parentTaskId: 'ordered-task',
      dependsOnCompletedTaskIds: undefined,
    }))

    expect(result.structuredContent.tasksNeedingRegistration).toEqual(expectedOrder)
  })

  test('should handle empty subtasks array by treating as undefined', async () => {
    const args = {
      taskId: 'task-no-subtasks',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'This task can be done without subtasks.',
      complexityAssessmentOutcomeSubtasks: [],
    }

    // Note: According to schema, empty array should not be allowed, but if it somehow passes,
    // the function should handle it gracefully
    const result = await handleAssessTask(args)

    expect(result.structuredContent).toEqual({
      assessmentId: 'assessment-4197b9e7b838bc41134622dc14126ee8',
      taskId: 'task-no-subtasks',
      parentTaskId: undefined,
      tasksNeedingRegistration: undefined,
    })
  })

  test('should return consistent structure for JSON serialization', async () => {
    const args = {
      taskId: 'json-test-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Testing JSON serialization consistency',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'json-subtask',
          title: 'JSON Test',
          description: 'Test JSON structure',
          goal: 'Ensure JSON consistency',
        },
      ],
    }

    const result = await handleAssessTask(args)

    // Verify that the content text is valid JSON and matches structured content
    const parsedContent = JSON.parse(result.content[0].text)
    expect(parsedContent).toEqual(result.structuredContent)

    // Verify JSON can be stringified and parsed again
    const reSerializedContent = JSON.parse(JSON.stringify(result.structuredContent))
    expect(reSerializedContent).toEqual(result.structuredContent)
  })

  test('should assess task with subtasks having requirements', async () => {
    const args = {
      taskId: 'task-with-requirements',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'This task requires subtasks with specific requirements.',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'requirements-subtask-1',
          title: 'Subtask with Requirements',
          description: 'This subtask has specific requirements',
          goal: 'Complete work meeting all requirements',
          missingKnowledge: [
            {
              knowledgeId: 'db-access',
              title: 'Database access required',
              description: 'Need database access to complete this subtask',
            },
            {
              knowledgeId: 'admin-perms',
              title: 'Admin permissions needed',
              description: 'Require administrative permissions for this task',
            },
          ],
        },
        {
          taskId: 'requirements-subtask-2',
          title: 'Another Subtask',
          description: 'Another subtask with different requirements',
          goal: 'Complete secondary work',
          missingKnowledge: [
            {
              knowledgeId: 'network-conn',
              title: 'Network connectivity',
              description: 'Need stable network connection',
            },
            {
              knowledgeId: 'api-key',
              title: 'Valid API key',
              description: 'Require valid API key for service access',
            },
            {
              knowledgeId: 'fs-access',
              title: 'File system access',
              description: 'Need file system permissions',
            },
          ],
        },
      ],
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent).toEqual({
      assessmentId: 'assessment-3c1f0c262d0a9d6ce395edd76141d508',
      taskId: 'task-with-requirements',
      parentTaskId: undefined,
      tasksNeedingRegistration: [
        { taskId: 'knowledge-db-access', parentTaskId: 'task-with-requirements', dependsOnCompletedTaskIds: undefined },
        { taskId: 'knowledge-admin-perms', parentTaskId: 'task-with-requirements', dependsOnCompletedTaskIds: undefined },
        { taskId: 'knowledge-network-conn', parentTaskId: 'task-with-requirements', dependsOnCompletedTaskIds: undefined },
        { taskId: 'knowledge-api-key', parentTaskId: 'task-with-requirements', dependsOnCompletedTaskIds: undefined },
        { taskId: 'knowledge-fs-access', parentTaskId: 'task-with-requirements', dependsOnCompletedTaskIds: undefined },
        {
          taskId: 'requirements-subtask-1',
          parentTaskId: 'task-with-requirements',
          dependsOnCompletedTaskIds: ['knowledge-db-access', 'knowledge-admin-perms'],
        },
        {
          taskId: 'requirements-subtask-2',
          parentTaskId: 'task-with-requirements',
          dependsOnCompletedTaskIds: ['knowledge-network-conn', 'knowledge-api-key', 'knowledge-fs-access'],
        },
      ],
    })
  })
})

describe('assess_task schema validation', () => {
  test('should validate minimal required fields', () => {
    const validArgs = {
      taskId: 'test-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Simple task assessment',
    }

    const result = AssessTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should validate with subtasks', () => {
    const validArgs = {
      taskId: 'test-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Complex task assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'subtask-1',
          title: 'Subtask Title',
          description: 'Subtask Description',
          goal: 'Subtask Goal',
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should validate subtasks with requirements', () => {
    const validArgs = {
      taskId: 'test-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Complex task assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'subtask-1',
          title: 'Subtask Title',
          description: 'Subtask Description',
          goal: 'Subtask Goal',
          missingKnowledge: [
            {
              knowledgeId: 'db-access',
              title: 'Database access',
              description: 'Need database access',
            },
            {
              knowledgeId: 'admin-perms',
              title: 'Admin permissions',
              description: 'Need admin permissions',
            },
          ],
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should validate subtasks without requirements', () => {
    const validArgs = {
      taskId: 'test-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Complex task assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'subtask-1',
          title: 'Subtask Title',
          description: 'Subtask Description',
          goal: 'Subtask Goal',
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should reject empty id', () => {
    const invalidArgs = {
      taskId: '',
      complexityAssessment: 'Valid assessment',
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty complexity assessment', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: '',
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject missing id', () => {
    const invalidArgs = {
      complexityAssessment: 'Valid assessment',
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject missing complexity assessment', () => {
    const invalidArgs = {
      taskId: 'valid-id',
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty subtasks array', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [],
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject subtask with empty id', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: '',
          title: 'Valid Title',
          description: 'Valid Description',
          goal: 'Valid Goal',
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject subtask with empty title', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'valid-id',
          title: '',
          description: 'Valid Description',
          goal: 'Valid Goal',
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject subtask with empty description', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'valid-id',
          title: 'Valid Title',
          description: '',
          goal: 'Valid Goal',
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject subtask with empty goal', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'valid-id',
          title: 'Valid Title',
          description: 'Valid Description',
          goal: '',
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject subtask missing required fields', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'valid-id',
          title: 'Valid Title',
          // missing description and goal
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject non-string id', () => {
    const invalidArgs = {
      taskId: 123,
      complexityAssessment: 'Valid assessment',
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject non-string complexity assessment', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: 123,
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject non-array subtasks', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: 'not-an-array',
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should accept multiple valid subtasks', () => {
    const validArgs = {
      taskId: 'valid-id',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'subtask-1',
          title: 'Title 1',
          description: 'Description 1',
          goal: 'Goal 1',
        },
        {
          taskId: 'subtask-2',
          title: 'Title 2',
          description: 'Description 2',
          goal: 'Goal 2',
        },
        {
          taskId: 'subtask-3',
          title: 'Title 3',
          description: 'Description 3',
          goal: 'Goal 3',
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should validate with unicode and special characters', () => {
    const validArgs = {
      taskId: 'test-task-🚀',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Assessment with unicode 中文 and symbols @#$%',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'subtask-测试',
          title: 'Title with "quotes" & symbols',
          description: 'Description with émojis 🎯 and more',
          goal: 'Goal with ∑∆∫ symbols',
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should reject subtask with empty missingKnowledge array', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'valid-id',
          title: 'Valid Title',
          description: 'Valid Description',
          goal: 'Valid Goal',
          missingKnowledge: [],
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject subtask with invalid missingKnowledge objects', () => {
    const invalidArgs = {
      taskId: 'valid-id',
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'valid-id',
          title: 'Valid Title',
          description: 'Valid Description',
          goal: 'Valid Goal',
          missingKnowledge: [
            {
              knowledgeId: 'valid-id',
              title: 'Valid requirement',
              description: 'Valid description',
            },
            {
              knowledgeId: '',
              title: '',
              description: '',
            },
          ],
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should accept subtask with single missingKnowledge item', () => {
    const validArgs = {
      taskId: 'valid-id',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'valid-id',
          title: 'Valid Title',
          description: 'Valid Description',
          goal: 'Valid Goal',
          missingKnowledge: [
            {
              knowledgeId: 'single-req',
              title: 'Single requirement',
              description: 'A single knowledge requirement',
            },
          ],
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should accept subtask with multiple missingKnowledge items', () => {
    const validArgs = {
      taskId: 'valid-id',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Valid assessment',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'valid-id',
          title: 'Valid Title',
          description: 'Valid Description',
          goal: 'Valid Goal',
          missingKnowledge: [
            {
              knowledgeId: 'db-access',
              title: 'Database access required',
              description: 'Need database access for this subtask',
            },
            {
              knowledgeId: 'admin-perms',
              title: 'Admin permissions needed',
              description: 'Require admin permissions',
            },
            {
              knowledgeId: 'network',
              title: 'Network connectivity',
              description: 'Need network access',
            },
            {
              knowledgeId: 'api-creds',
              title: 'Valid API credentials',
              description: 'Need valid API credentials',
            },
            {
              knowledgeId: 'fs-write',
              title: 'File system write access',
              description: 'Need file system write permissions',
            },
          ],
        },
      ],
    }

    const result = AssessTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should correctly prefix knowledge task IDs', async () => {
    const args = {
      taskId: 'main-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Task requiring knowledge acquisition',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'implementation-subtask',
          title: 'Implementation Task',
          description: 'Implement the solution',
          goal: 'Create working implementation',
          missingKnowledge: [
            {
              knowledgeId: 'api-docs',
              title: 'API Documentation',
              description: 'Need to understand the API structure',
            },
            {
              knowledgeId: 'best-practices',
              title: 'Best Practices',
              description: 'Learn current best practices',
            },
          ],
        },
      ],
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent.tasksNeedingRegistration).toHaveLength(3)
    expect(result.structuredContent.tasksNeedingRegistration?.[0]).toEqual({
      taskId: 'knowledge-api-docs',
      parentTaskId: 'main-task',
    })
    expect(result.structuredContent.tasksNeedingRegistration?.[1]).toEqual({
      taskId: 'knowledge-best-practices',
      parentTaskId: 'main-task',
    })
    expect(result.structuredContent.tasksNeedingRegistration?.[2]).toEqual({
      taskId: 'implementation-subtask',
      parentTaskId: 'main-task',
      dependsOnCompletedTaskIds: ['knowledge-api-docs', 'knowledge-best-practices'],
    })
  })

  test('should handle mixed subtasks with and without missing knowledge', async () => {
    const args = {
      taskId: 'mixed-requirements-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Task with mixed subtask requirements',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'no-knowledge-subtask',
          title: 'Simple Subtask',
          description: 'Subtask that needs no additional knowledge',
          goal: 'Complete simple work',
        },
        {
          taskId: 'knowledge-subtask',
          title: 'Complex Subtask',
          description: 'Subtask requiring research',
          goal: 'Complete complex work',
          missingKnowledge: [
            {
              knowledgeId: 'research-data',
              title: 'Research Data',
              description: 'Need research data',
            },
          ],
        },
        {
          taskId: 'another-simple-subtask',
          title: 'Another Simple Task',
          description: 'Another subtask with no knowledge needs',
          goal: 'Complete more simple work',
        },
      ],
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent.tasksNeedingRegistration).toHaveLength(4)
    expect(result.structuredContent.tasksNeedingRegistration).toEqual([
      {
        taskId: 'knowledge-research-data',
        parentTaskId: 'mixed-requirements-task',
      },
      {
        taskId: 'no-knowledge-subtask',
        parentTaskId: 'mixed-requirements-task',
        dependsOnCompletedTaskIds: undefined,
      },
      {
        taskId: 'knowledge-subtask',
        parentTaskId: 'mixed-requirements-task',
        dependsOnCompletedTaskIds: ['knowledge-research-data'],
      },
      {
        taskId: 'another-simple-subtask',
        parentTaskId: 'mixed-requirements-task',
        dependsOnCompletedTaskIds: undefined,
      },
    ])
  })

  test('should handle large number of subtasks', async () => {
    const manySubtasks = Array.from({ length: 50 }, (_, i) => ({
      taskId: `subtask-${i + 1}`,
      title: `Subtask ${i + 1}`,
      description: `Description for subtask ${i + 1}`,
      goal: `Goal for subtask ${i + 1}`,
    }))

    const args = {
      taskId: 'stress-test-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Task with many subtasks to test performance',
      complexityAssessmentOutcomeSubtasks: manySubtasks,
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent.tasksNeedingRegistration).toHaveLength(50)
    expect(result.structuredContent.tasksNeedingRegistration?.[0]).toEqual({
      taskId: 'subtask-1',
      parentTaskId: 'stress-test-task',
      dependsOnCompletedTaskIds: undefined,
    })
    expect(result.structuredContent.tasksNeedingRegistration?.[49]).toEqual({
      taskId: 'subtask-50',
      parentTaskId: 'stress-test-task',
      dependsOnCompletedTaskIds: undefined,
    })
  })

  test('should handle subtask with many missing knowledge items', async () => {
    const manyKnowledge = Array.from({ length: 15 }, (_, i) => ({
      knowledgeId: `knowledge-${i + 1}`,
      title: `Knowledge ${i + 1}`,
      description: `Description for knowledge ${i + 1}`,
    }))

    const args = {
      taskId: 'knowledge-intensive-task',
      currentStatus: 'not-started' as const,
      complexityAssessment: 'Task requiring extensive knowledge acquisition',
      complexityAssessmentOutcomeSubtasks: [
        {
          taskId: 'research-heavy-subtask',
          title: 'Research Heavy Subtask',
          description: 'Subtask requiring lots of research',
          goal: 'Complete research and implementation',
          missingKnowledge: manyKnowledge,
        },
      ],
    }

    const result = await handleAssessTask(args)

    expect(result.structuredContent.tasksNeedingRegistration).toHaveLength(16)

    // Check knowledge tasks
    const knowledgeTasks = result.structuredContent.tasksNeedingRegistration?.slice(0, 15)
    expect(knowledgeTasks?.[0]).toEqual({
      taskId: 'knowledge-knowledge-1',
      parentTaskId: 'knowledge-intensive-task',
    })
    expect(knowledgeTasks?.[14]).toEqual({
      taskId: 'knowledge-knowledge-15',
      parentTaskId: 'knowledge-intensive-task',
    })

    // Check subtask with all dependencies
    const subtask = result.structuredContent.tasksNeedingRegistration?.[15]
    expect(subtask?.taskId).toBe('research-heavy-subtask')
    expect(subtask?.dependsOnCompletedTaskIds).toHaveLength(15)
    expect(subtask?.dependsOnCompletedTaskIds?.[0]).toBe('knowledge-knowledge-1')
    expect(subtask?.dependsOnCompletedTaskIds?.[14]).toBe('knowledge-knowledge-15')
  })

  test('should throw error when task status is not not-started', async () => {
    const argsInProgress = {
      taskId: 'already-started-task',
      currentStatus: 'in-progress' as const,
      complexityAssessment: 'This task is already in progress',
    }

    await expect(handleAssessTask(argsInProgress)).rejects.toThrow(
      "Task 'already-started-task' can't be assessed because it has already been started."
    )
  })

  test('should throw error when task status is complete', async () => {
    const argsComplete = {
      taskId: 'completed-task',
      currentStatus: 'complete' as const,
      complexityAssessment: 'This task is already complete',
    }

    await expect(handleAssessTask(argsComplete)).rejects.toThrow(
      "Task 'completed-task' can't be assessed because it has already been started."
    )
  })
})
