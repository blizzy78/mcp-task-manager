import { describe, expect, test } from 'vitest'
import { handleRegisterTask, RegisterTaskArgsSchema } from '../tools/register_task.js'

describe('register_task tests', () => {
  test('should register a simple task successfully', async () => {
    const args = {
      taskId: 'test-task-1',
      title: 'Test Task',
      description: 'A test task for validation',
      goal: 'Validate that task registration works',
    }

    const result = await handleRegisterTask(args)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')

    expect(result.content).toHaveLength(1)
    expect(result.content[0]).toEqual({
      type: 'text',
      audience: ['assistant'],
      text: JSON.stringify({
        taskId: 'test-task-1',
        parentTaskId: undefined,
        dependsOnCompletedTaskIds: undefined,
        currentStatus: 'not-started',
        needsAssessment: true,
      }),
    })

    expect(result.structuredContent).toEqual({
      taskId: 'test-task-1',
      parentTaskId: undefined,
      dependsOnCompletedTaskIds: undefined,
      currentStatus: 'not-started',
      needsAssessment: true,
    })
  })

  test('should register a subtask with parent successfully', async () => {
    const args = {
      taskId: 'subtask-1',
      parentTaskId: 'parent-task',
      title: 'Subtask Test',
      description: 'A subtask for testing',
      goal: 'Validate subtask registration',
    }

    const result = await handleRegisterTask(args)

    expect(result.structuredContent).toEqual({
      taskId: 'subtask-1',
      parentTaskId: 'parent-task',
      dependsOnCompletedTaskIds: undefined,
      currentStatus: 'not-started',
      needsAssessment: true,
    })
  })

  test('should register task with dependencies successfully', async () => {
    const args = {
      taskId: 'dependent-task',
      title: 'Dependent Task',
      description: 'A task that depends on others',
      goal: 'Test dependency handling',
      dependsOnCompletedTaskIds: ['task-1', 'task-2'],
    }

    const result = await handleRegisterTask(args)

    expect(result.structuredContent).toEqual({
      taskId: 'dependent-task',
      parentTaskId: undefined,
      dependsOnCompletedTaskIds: ['task-1', 'task-2'],
      currentStatus: 'not-started',
      needsAssessment: true,
    })
  })

  test('should register complex task with parent and dependencies', async () => {
    const args = {
      taskId: 'complex-task',
      parentTaskId: 'main-project',
      title: 'Complex Task',
      description: 'A complex task with both parent and dependencies',
      goal: 'Test all optional parameters',
      dependsOnCompletedTaskIds: ['prereq-1', 'prereq-2', 'prereq-3'],
    }

    const result = await handleRegisterTask(args)

    expect(result.structuredContent).toEqual({
      taskId: 'complex-task',
      parentTaskId: 'main-project',
      dependsOnCompletedTaskIds: ['prereq-1', 'prereq-2', 'prereq-3'],
      currentStatus: 'not-started',
      needsAssessment: true,
    })
  })

  test('should handle special characters in task data', async () => {
    const args = {
      taskId: 'special-chars-task',
      title: 'Task with "quotes" & symbols',
      description: 'Testing with special chars: <>{}[]()@#$%^&*',
      goal: 'Ensure special characters are handled properly',
    }

    const result = await handleRegisterTask(args)

    expect(result.structuredContent.taskId).toBe('special-chars-task')
    expect(result.structuredContent.currentStatus).toBe('not-started')
    expect(result.structuredContent.needsAssessment).toBe(true)
  })

  test('should handle long text content', async () => {
    const longDescription = 'A'.repeat(1000)
    const longTitle = 'Long Task Title '.repeat(10)
    const longGoal = 'This is a very long goal description '.repeat(20)

    const args = {
      taskId: 'long-content-task',
      title: longTitle,
      description: longDescription,
      goal: longGoal,
    }

    const result = await handleRegisterTask(args)

    expect(result.structuredContent.taskId).toBe('long-content-task')
    expect(result.structuredContent.currentStatus).toBe('not-started')
    expect(result.structuredContent.needsAssessment).toBe(true)
  })

  test('should preserve exact dependency order', async () => {
    const dependencies = ['first', 'second', 'third', 'fourth']
    const args = {
      taskId: 'order-test-task',
      title: 'Order Test',
      description: 'Testing dependency order preservation',
      goal: 'Ensure dependency order is maintained',
      dependsOnCompletedTaskIds: dependencies,
    }

    const result = await handleRegisterTask(args)

    expect(result.structuredContent.dependsOnCompletedTaskIds).toEqual(dependencies)
  })

  test('should handle unicode characters', async () => {
    const args = {
      taskId: 'unicode-task-测试',
      title: 'Unicode Task 🚀',
      description: 'Testing with unicode: 中文, émojis 🎯, and symbols ∑∆∫',
      goal: 'Ensure unicode support works properly',
    }

    const result = await handleRegisterTask(args)

    expect(result.structuredContent.taskId).toBe('unicode-task-测试')
    expect(result.structuredContent.currentStatus).toBe('not-started')
  })

  test('should ensure content matches structuredContent', async () => {
    const args = {
      taskId: 'content-consistency-test',
      title: 'Content Consistency Test',
      description: 'Test to verify content and structured content match',
      goal: 'Ensure JSON consistency',
    }

    const result = await handleRegisterTask(args)

    const parsedContent = JSON.parse(result.content[0].text)
    expect(parsedContent).toEqual(result.structuredContent)

    // Verify content structure
    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].audience).toEqual(['assistant'])
  })

  test('should register task with single dependency', async () => {
    const args = {
      taskId: 'single-dep-task',
      title: 'Single Dependency Task',
      description: 'Task with exactly one dependency',
      goal: 'Test single dependency handling',
      dependsOnCompletedTaskIds: ['prerequisite-task'],
    }

    const result = await handleRegisterTask(args)

    expect(result.structuredContent).toEqual({
      taskId: 'single-dep-task',
      parentTaskId: undefined,
      dependsOnCompletedTaskIds: ['prerequisite-task'],
      currentStatus: 'not-started',
      needsAssessment: true,
    })
  })

  test('should always return correct hardcoded values', async () => {
    const testCases = [
      {
        taskId: 'simple-task',
        title: 'Simple Task',
        description: 'Simple task description',
        goal: 'Simple goal',
      },
      {
        taskId: 'complex-task',
        parentTaskId: 'parent-task',
        title: 'Complex Task',
        description: 'Complex task description',
        goal: 'Complex goal',
        dependsOnCompletedTaskIds: ['dep1', 'dep2', 'dep3'],
      },
    ]

    for (const args of testCases) {
      const result = await handleRegisterTask(args)

      expect(result.structuredContent.currentStatus).toBe('not-started')
      expect(result.structuredContent.needsAssessment).toBe(true)
    }
  })

  test('should handle stress test with many dependencies', async () => {
    const manyDependencies = Array.from({ length: 50 }, (_, i) => `dependency-${i + 1}`)

    const args = {
      taskId: 'stress-test-task',
      title: 'Stress Test Task',
      description: 'Task with many dependencies to test performance',
      goal: 'Test system limits and performance',
      dependsOnCompletedTaskIds: manyDependencies,
    }

    const result = await handleRegisterTask(args)

    expect(result.structuredContent.dependsOnCompletedTaskIds).toHaveLength(50)
    expect(result.structuredContent.dependsOnCompletedTaskIds?.[0]).toBe('dependency-1')
    expect(result.structuredContent.dependsOnCompletedTaskIds?.[49]).toBe('dependency-50')
    expect(result.structuredContent.currentStatus).toBe('not-started')
    expect(result.structuredContent.needsAssessment).toBe(true)
  })
})

describe('register_task schema validation', () => {
  test('should validate minimal required fields', () => {
    const validArgs = {
      taskId: 'test-id',
      title: 'Test Title',
      description: 'Test Description',
      goal: 'Test Goal',
    }

    const result = RegisterTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should validate all optional fields', () => {
    const validArgs = {
      taskId: 'test-id',
      parentTaskId: 'parent-id',
      title: 'Test Title',
      description: 'Test Description',
      goal: 'Test Goal',
      dependsOnCompletedTaskIds: ['dep1', 'dep2'],
    }

    const result = RegisterTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should reject empty id', () => {
    const invalidArgs = {
      taskId: '',
      title: 'Test Title',
      description: 'Test Description',
      goal: 'Test Goal',
    }

    const result = RegisterTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty title', () => {
    const invalidArgs = {
      taskId: 'test-id',
      title: '',
      description: 'Test Description',
      goal: 'Test Goal',
    }

    const result = RegisterTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty description', () => {
    const invalidArgs = {
      taskId: 'test-id',
      title: 'Test Title',
      description: '',
      goal: 'Test Goal',
    }

    const result = RegisterTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty goal', () => {
    const invalidArgs = {
      taskId: 'test-id',
      title: 'Test Title',
      description: 'Test Description',
      goal: '',
    }

    const result = RegisterTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty parentTaskId when provided', () => {
    const invalidArgs = {
      taskId: 'test-id',
      parentTaskId: '',
      title: 'Test Title',
      description: 'Test Description',
      goal: 'Test Goal',
    }

    const result = RegisterTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject empty dependsOnCompletedTaskIds array', () => {
    const invalidArgs = {
      taskId: 'test-id',
      title: 'Test Title',
      description: 'Test Description',
      goal: 'Test Goal',
      dependsOnCompletedTaskIds: [],
    }

    const result = RegisterTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject dependsOnCompletedTaskIds with empty string', () => {
    const invalidArgs = {
      taskId: 'test-id',
      title: 'Test Title',
      description: 'Test Description',
      goal: 'Test Goal',
      dependsOnCompletedTaskIds: ['valid-id', ''],
    }

    const result = RegisterTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject missing required fields', () => {
    const invalidArgs = {
      taskId: 'test-id',
      // missing title, description, goal
    }

    const result = RegisterTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should reject non-string values', () => {
    const invalidArgs = {
      taskId: 123,
      title: 'Test Title',
      description: 'Test Description',
      goal: 'Test Goal',
    }

    const result = RegisterTaskArgsSchema.safeParse(invalidArgs)
    expect(result.success).toBe(false)
  })

  test('should accept valid dependsOnCompletedTaskIds with multiple items', () => {
    const validArgs = {
      taskId: 'test-id',
      title: 'Test Title',
      description: 'Test Description',
      goal: 'Test Goal',
      dependsOnCompletedTaskIds: ['dep1', 'dep2', 'dep3', 'dep4', 'dep5'],
    }

    const result = RegisterTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })

  test('should accept task without requirements field', () => {
    const validArgs = {
      taskId: 'test-id',
      title: 'Test Title',
      description: 'Test Description',
      goal: 'Test Goal',
    }

    const result = RegisterTaskArgsSchema.safeParse(validArgs)
    expect(result.success).toBe(true)
  })
})
