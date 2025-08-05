import { describe, expect, it } from 'vitest'
import { handleCreateTask } from './create_task.js'
import { TaskIDSchema, UncertaintyAreaStatus } from './tasks.js'

describe('create_task handler', () => {
  it('should create a task with required fields', async () => {
    const args = {
      title: 'Test Task',
      description: 'This is a test task',
      goal: 'Test goal',
      uncertaintyAreas: [],
    }

    const result = await handleCreateTask(args)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')
    expect(result.content).toBeInstanceOf(Array)
    expect(result.content).toHaveLength(2)
    expect(result.content[0]).toMatchObject({
      type: 'text',
      audience: ['assistant'],
    })
    expect(result.structuredContent).toHaveProperty('taskID')
    expect(result.structuredContent.currentStatus).toBe('not-started')
  })

  it('should create a task with parent task', async () => {
    const parentTaskID = TaskIDSchema.parse('parent123')
    const args = {
      title: 'Child Task',
      description: 'This is a child task',
      goal: 'Child goal',
      parentTaskID,
      uncertaintyAreas: [],
    }

    const result = await handleCreateTask(args)

    expect(result.structuredContent.parentTaskID).toBe(parentTaskID)
  })

  it('should create a task with dependent tasks', async () => {
    const dependentTaskIDs = [TaskIDSchema.parse('dep1'), TaskIDSchema.parse('dep2')]
    const args = {
      title: 'Dependent Task',
      description: 'This task depends on others',
      goal: 'Dependent goal',
      dependentTaskIDs,
      uncertaintyAreas: [],
    }

    const result = await handleCreateTask(args)

    expect(result.structuredContent.dependentTaskIDs).toEqual(dependentTaskIDs)
  })

  it('should create a task with uncertainty areas', async () => {
    const args = {
      title: 'Uncertain Task',
      description: 'Task with uncertainties',
      goal: 'Uncertain goal',
      uncertaintyAreas: [
        { description: 'Need more info', status: UncertaintyAreaStatus.parse('open') },
        { description: 'Clarify requirements', status: UncertaintyAreaStatus.parse('resolved') },
      ],
    }

    const result = await handleCreateTask(args)

    expect(result.content[1].text).toContain('uncertainty areas')
  })

  it('should generate consistent task IDs for same input', async () => {
    const args = {
      title: 'Consistent Task',
      description: 'Same description',
      goal: 'Same goal',
      uncertaintyAreas: [],
    }

    const result1 = await handleCreateTask(args)
    const result2 = await handleCreateTask(args)

    expect(result1.structuredContent.taskID).toBe(result2.structuredContent.taskID)
  })
})
