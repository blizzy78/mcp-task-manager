import { zodToJsonSchema } from 'zod-to-json-schema';
import { mustDecompose, newTaskID, SimpleTaskSchema, TaskComplexitySchema, toBasicTaskInfo, TodoStatus, } from '../tasks.js';
export const CreateTaskArgsSchema = SimpleTaskSchema.extend({
    estimatedComplexity: TaskComplexitySchema,
});
export const CREATE_TASK = 'create_task';
export const createTaskTool = {
    name: CREATE_TASK,
    title: 'Create task',
    description: `Creates a new task that must be executed.
If decomposing a complex task is required, must use 'decompose_task' first before executing it.
All tasks start in the todo status.
Must use 'update_task' before executing this task, and when executing this task has finished.`,
    inputSchema: zodToJsonSchema(CreateTaskArgsSchema),
};
export async function handleCreateTask({ title, description, goal, definitionsOfDone, criticalPath, uncertaintyAreas, estimatedComplexity }, taskDB, singleAgent) {
    const task = {
        taskID: newTaskID(),
        status: TodoStatus,
        dependsOnTaskIDs: [],
        title,
        description,
        goal,
        definitionsOfDone,
        criticalPath: !!criticalPath,
        uncertaintyAreas,
        estimatedComplexity,
        lessonsLearned: [],
        verificationEvidence: [],
    };
    taskDB.set(task.taskID, task);
    if (singleAgent) {
        taskDB.setCurrentTask(task.taskID);
    }
    const incompleteTaskIDs = taskDB.incompleteTasksInTree(task.taskID).map((t) => t.taskID);
    const res = {
        taskCreated: toBasicTaskInfo(task, false, false, true),
        incompleteTasksIdealOrder: singleAgent ? incompleteTaskIDs : undefined,
    };
    return {
        content: [
            mustDecompose(task) &&
                {
                    type: 'text',
                    text: 'Task must be decomposed before execution',
                    audience: ['assistant'],
                },
            {
                type: 'resource_link',
                uri: `task://${task.taskID}`,
                name: task.taskID,
                title: task.title,
                annotations: {
                    audience: ['assistant'],
                    priority: 1,
                },
            },
        ].filter(Boolean),
        structuredContent: res,
    };
}
