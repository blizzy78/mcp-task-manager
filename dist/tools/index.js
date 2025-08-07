import { CREATE_TASK, CreateTaskArgsSchema, createTaskTool, handleCreateTask } from './create_task.js';
import { handleTaskInfo, TASK_INFO, TaskInfoArgsSchema, taskInfoTool } from './task_info.js';
import { handleTransitionTaskStatus, TRANSITION_TASK_STATUS, TransitionTaskStatusArgsSchema, transitionTaskStatusTool, } from './transition_task_status.js';
import { handleUpdateTask, UPDATE_TASK, UpdateTaskArgsSchema, updateTaskTool } from './update_task.js';
export const tools = [createTaskTool, updateTaskTool, transitionTaskStatusTool, taskInfoTool];
export const toolHandlers = {
    [CREATE_TASK]: {
        handler: handleCreateTask,
        schema: CreateTaskArgsSchema,
    },
    [UPDATE_TASK]: {
        handler: handleUpdateTask,
        schema: UpdateTaskArgsSchema,
    },
    [TRANSITION_TASK_STATUS]: {
        handler: handleTransitionTaskStatus,
        schema: TransitionTaskStatusArgsSchema,
    },
    [TASK_INFO]: {
        handler: handleTaskInfo,
        schema: TaskInfoArgsSchema,
    },
};
