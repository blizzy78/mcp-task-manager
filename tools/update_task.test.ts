import { describe, expect, it } from 'vitest'
import { TaskIDSchema, UncertaintyAreaStatus } from './tasks.js'
import { handleUpdateTask } from './update_task.js'

describe('update_task handler', () => {
  it('should update a task', async () => {
    const taskID = TaskIDSchema.parse('task123')
    const args = {
      taskID,
      uncertaintyAreas: [{ description: 'Updated uncertainty', status: UncertaintyAreaStatus.parse('open') }],
    }

    const result = await handleUpdateTask(args)

    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('structuredContent')
    expect(result.content).toBeInstanceOf(Array)
    expect(result.content).toHaveLength(2)
    expect(result.content[1].text).toContain('Updated task with ID: task123')
  })

  it('should handle tasks with no uncertainty areas', async () => {
    const taskID = TaskIDSchema.parse('task456')
    const args = {
      taskID,
      uncertaintyAreas: [],
    }

    const result = await handleUpdateTask(args)

    expect(result.content[1].text).not.toContain('uncertainty areas')
  })

  it('should handle tasks with resolved uncertainty areas', async () => {
    const taskID = TaskIDSchema.parse('task789')
    const args = {
      taskID,
      uncertaintyAreas: [{ description: 'Resolved issue', status: UncertaintyAreaStatus.parse('resolved') }],
    }

    const result = await handleUpdateTask(args)

    expect(result.content[1].text).not.toContain('uncertainty areas')
  })

  it('should handle tasks with mixed uncertainty areas', async () => {
    const taskID = TaskIDSchema.parse('task999')
    const args = {
      taskID,
      uncertaintyAreas: [
        { description: 'Open issue', status: UncertaintyAreaStatus.parse('open') },
        { description: 'Resolved issue', status: UncertaintyAreaStatus.parse('resolved') },
      ],
    }

    const result = await handleUpdateTask(args)

    expect(result.content[1].text).toContain('uncertainty areas')
  })
})
