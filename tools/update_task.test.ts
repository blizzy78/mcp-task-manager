import { beforeEach, describe, expect, it } from 'vitest'
import { TaskDB } from '../task_db.js'
import { DoneStatus, FailedStatus, InProgressStatus, newTaskID, TodoStatus, type Task } from '../tasks.js'
import { handleUpdateTask } from './update_task.js'

describe('update_task tool handler', () => {
  let taskDB: TaskDB

  beforeEach(() => {
    taskDB = new TaskDB()
  })

  describe('status transitions', () => {
    it('should update task status from todo to in-progress', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Test Task',
        description: 'Test description',
        goal: 'Test goal',
        definitionsOfDone: ['Test done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              status: InProgressStatus,
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      expect(result.structuredContent).toMatchObject({
        tasksUpdated: [
          {
            taskID,
            title: 'Test Task',
            dependsOnTaskIDs: [],
            mustDecomposeBeforeExecution: undefined,
          },
        ],
      })

      const updatedTask = taskDB.get(taskID)!
      expect(updatedTask.status).toBe(InProgressStatus)
    })

    it('should update task status to done when no critical path dependencies', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'Test Task',
        description: 'Test description',
        goal: 'Test goal',
        definitionsOfDone: ['Test done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              status: DoneStatus,
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      const updatedTask = taskDB.get(taskID)!
      expect(updatedTask.status).toBe(DoneStatus)
    })

    it('should prevent transition to done when critical path dependencies are not done', async () => {
      const depTaskID = newTaskID()
      const depTask: Task = {
        taskID: depTaskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'Dependency Task',
        description: 'Dependency description',
        goal: 'Dependency goal',
        definitionsOfDone: ['Dependency done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(depTaskID, depTask)

      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [depTaskID],
        title: 'Dependent Task',
        description: 'Dependent description',
        goal: 'Dependent goal',
        definitionsOfDone: ['Dependent done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              status: DoneStatus,
            },
          },
        ],
      }

      await expect(handleUpdateTask(args, taskDB, false)).rejects.toThrow(
        `Can't transition task ${taskID} to done: Critical path dependencies are not done: ${depTaskID}`
      )
    })

    it('should allow transition to done when critical path dependencies are done', async () => {
      const depTaskID = newTaskID()
      const depTask: Task = {
        taskID: depTaskID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Dependency Task',
        description: 'Dependency description',
        goal: 'Dependency goal',
        definitionsOfDone: ['Dependency done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(depTaskID, depTask)

      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [depTaskID],
        title: 'Dependent Task',
        description: 'Dependent description',
        goal: 'Dependent goal',
        definitionsOfDone: ['Dependent done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              status: DoneStatus,
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      const updatedTask = taskDB.get(taskID)!
      expect(updatedTask.status).toBe(DoneStatus)
    })

    it('should prevent transition from done to failed', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: DoneStatus,
        dependsOnTaskIDs: [],
        title: 'Done Task',
        description: 'Already done',
        goal: 'Done goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              status: FailedStatus,
            },
          },
        ],
      }

      await expect(handleUpdateTask(args, taskDB, false)).rejects.toThrow(`Can't transition from done to failed`)
    })

    it('should prevent transition from failed to done', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: FailedStatus,
        dependsOnTaskIDs: [],
        title: 'Failed Task',
        description: 'Already failed',
        goal: 'Failed goal',
        definitionsOfDone: ['Failed'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              status: DoneStatus,
            },
          },
        ],
      }

      await expect(handleUpdateTask(args, taskDB, false)).rejects.toThrow(`Can't transition from failed to done`)
    })

    it('should allow non-critical path dependencies to be incomplete', async () => {
      const depTaskID = newTaskID()
      const depTask: Task = {
        taskID: depTaskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'Non-critical Dependency',
        description: 'Not on critical path',
        goal: 'Non-critical goal',
        definitionsOfDone: ['Non-critical done'],
        criticalPath: false, // Not on critical path
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(depTaskID, depTask)

      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [depTaskID],
        title: 'Dependent Task',
        description: 'Can complete despite non-critical dep',
        goal: 'Completion goal',
        definitionsOfDone: ['Can be done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              status: DoneStatus,
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      const updatedTask = taskDB.get(taskID)!
      expect(updatedTask.status).toBe(DoneStatus)
    })
  })

  describe('task property updates', () => {
    it('should update task title, description, and goal', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Old Title',
        description: 'Old description',
        goal: 'Old goal',
        definitionsOfDone: ['Old done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              title: 'New Title',
              description: 'New description',
              goal: 'New goal',
              criticalPath: false,
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      const updatedTask = taskDB.get(taskID)!
      expect(updatedTask.title).toBe('New Title')
      expect(updatedTask.description).toBe('New description')
      expect(updatedTask.goal).toBe('New goal')
      expect(updatedTask.criticalPath).toBe(false)
    })

    it('should update estimated complexity', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'trivial',
          description: 'Old complexity',
        },
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              estimatedComplexity: {
                level: 'medium, must decompose before execution' as const,
                description: 'New complexity assessment',
              },
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      const updatedTask = taskDB.get(taskID)!
      expect(updatedTask.estimatedComplexity).toMatchObject({
        level: 'medium, must decompose before execution',
        description: 'New complexity assessment',
      })
    })
  })

  describe('adding properties', () => {
    it('should add definitions of done', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Original done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            add: {
              definitionsOfDone: ['Additional done', 'Another done'],
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      const updatedTask = taskDB.get(taskID)!
      expect(updatedTask.definitionsOfDone).toEqual(['Original done', 'Additional done', 'Another done'])
    })

    it('should add uncertainty areas', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [
          {
            title: 'Original uncertainty',
            description: 'Original description',
          },
        ],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            add: {
              uncertaintyAreas: [
                {
                  title: 'New uncertainty',
                  description: 'New uncertainty description',
                },
              ],
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      const updatedTask = taskDB.get(taskID)!
      expect(updatedTask.uncertaintyAreas).toEqual([
        {
          title: 'Original uncertainty',
          description: 'Original description',
        },
        {
          title: 'New uncertainty',
          description: 'New uncertainty description',
        },
      ])
    })

    it('should add lessons learned', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: ['Original lesson'],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            add: {
              lessonsLearned: ['New lesson', 'Another lesson'],
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      const updatedTask = taskDB.get(taskID)!
      expect(updatedTask.lessonsLearned).toEqual(['Original lesson', 'New lesson', 'Another lesson'])
    })

    it('should add verification evidence', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: ['Original evidence'],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            add: {
              verificationEvidence: ['New evidence', 'More evidence'],
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      const updatedTask = taskDB.get(taskID)!
      expect(updatedTask.verificationEvidence).toEqual(['Original evidence', 'New evidence', 'More evidence'])
    })
  })

  describe('removing properties', () => {
    it('should remove task dependencies', async () => {
      const rootTaskID = newTaskID()
      const dep1ID = newTaskID()
      const dep2ID = newTaskID()
      const dep3ID = newTaskID()

      const task1: Task = {
        taskID: dep1ID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task 1',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const task2: Task = {
        taskID: dep2ID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task 2',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const task3: Task = {
        taskID: dep3ID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task 3',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      const rootTask: Task = {
        taskID: rootTaskID,
        status: TodoStatus,
        dependsOnTaskIDs: [dep1ID, dep2ID, dep3ID],
        title: 'Task',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }

      taskDB.set(rootTaskID, rootTask)
      taskDB.set(dep1ID, task1)
      taskDB.set(dep2ID, task2)
      taskDB.set(dep3ID, task3)

      const args = {
        tasks: [
          {
            taskID: rootTaskID,
            remove: {
              dependsOnTaskIDs: [dep2ID],
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      const updatedTask = taskDB.get(rootTaskID)!
      expect(updatedTask.dependsOnTaskIDs).toEqual([dep1ID, dep3ID])
    })
  })

  describe('multiple task updates', () => {
    it('should update multiple tasks in single call', async () => {
      const task1ID = newTaskID()
      const task1: Task = {
        taskID: task1ID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task 1',
        description: 'First task',
        goal: 'First goal',
        definitionsOfDone: ['First done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(task1ID, task1)

      const task2ID = newTaskID()
      const task2: Task = {
        taskID: task2ID,
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title: 'Task 2',
        description: 'Second task',
        goal: 'Second goal',
        definitionsOfDone: ['Second done'],
        criticalPath: false,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(task2ID, task2)

      const args = {
        tasks: [
          {
            taskID: task1ID,
            set: {
              status: InProgressStatus,
            },
          },
          {
            taskID: task2ID,
            set: {
              title: 'Updated Task 2',
            },
            add: {
              lessonsLearned: ['Lesson from task 2'],
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      expect(result.structuredContent.tasksUpdated).toHaveLength(2)

      const updatedTask1 = taskDB.get(task1ID)!
      const updatedTask2 = taskDB.get(task2ID)!

      expect(updatedTask1.status).toBe(InProgressStatus)
      expect(updatedTask2.title).toBe('Updated Task 2')
      expect(updatedTask2.lessonsLearned).toEqual(['Lesson from task 2'])
    })
  })

  describe('error handling', () => {
    it('should throw error for non-existent task', async () => {
      const nonExistentID = newTaskID()
      const args = {
        tasks: [
          {
            taskID: nonExistentID,
            set: {
              status: InProgressStatus,
            },
          },
        ],
      }

      await expect(handleUpdateTask(args, taskDB, false)).rejects.toThrow(`Task not found: ${nonExistentID}`)
    })
  })

  describe('result formatting', () => {
    it('should not include dependsOnTaskIDs for done/failed tasks', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'Task',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              status: DoneStatus,
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      // For done tasks, dependsOnTaskIDs should be undefined, but the property may still be present
      expect(result.structuredContent.tasksUpdated[0]).toMatchObject({
        taskID,
        title: 'Task',
        mustDecomposeBeforeExecution: undefined,
      })
      expect(result.structuredContent.tasksUpdated[0].dependsOnTaskIDs).toBeUndefined()
    })

    it('should include mustDecomposeBeforeExecution for todo tasks', async () => {
      const taskID = newTaskID()
      const task: Task = {
        taskID,
        status: InProgressStatus,
        dependsOnTaskIDs: [],
        title: 'Task',
        description: 'Description',
        goal: 'Goal',
        definitionsOfDone: ['Done'],
        criticalPath: true,
        uncertaintyAreas: [],
        estimatedComplexity: {
          level: 'medium, must decompose before execution',
          description: 'Complex task',
        },
        lessonsLearned: [],
        verificationEvidence: [],
      }
      taskDB.set(taskID, task)

      const args = {
        tasks: [
          {
            taskID,
            set: {
              status: TodoStatus,
            },
          },
        ],
      }

      const result = await handleUpdateTask(args, taskDB, false)

      // For todo tasks, mustDecomposeBeforeExecution should be included based on complexity
      expect(result.structuredContent.tasksUpdated[0]).toMatchObject({
        taskID,
        title: 'Task',
        dependsOnTaskIDs: [],
        mustDecomposeBeforeExecution: true, // Complex task needs decomposition
      })
    })
  })
})
