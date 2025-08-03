import { ASSESS_TASK, AssessTaskArgsSchema, assessTaskTool, handleAssessTask } from './assess_task.js';
import { handleRegisterTask, REGISTER_TASK, RegisterTaskArgsSchema, registerTaskTool } from './register_task.js';
import { handleTaskStatus, TASK_STATUS, TaskStatusArgsSchema, taskStatusTool } from './task_status.js';
export const tools = [assessTaskTool, taskStatusTool, registerTaskTool];
export const toolHandlers = {
    [ASSESS_TASK]: {
        handler: handleAssessTask,
        schema: AssessTaskArgsSchema,
    },
    [TASK_STATUS]: {
        handler: handleTaskStatus,
        schema: TaskStatusArgsSchema,
    },
    [REGISTER_TASK]: {
        handler: handleRegisterTask,
        schema: RegisterTaskArgsSchema,
    },
};
