import { CREATE_TASK, CreateTaskArgsSchema, createTaskTool, handleCreateTask } from './create_task.js';
import { CURRENT_TASK, CurrentTaskArgsSchema, currentTaskTool, handleCurrentTask } from './current_task.js';
import { DECOMPOSE_TASK, DecomposeTaskArgsSchema, decomposeTaskTool, handleDecomposeTask } from './decompose_task.js';
import { handleTaskInfo, TASK_INFO, TaskInfoArgsSchema, taskInfoTool } from './task_info.js';
import { handleUpdateTask, UPDATE_TASK, UpdateTaskArgsSchema, updateTaskTool } from './update_task.js';
export function tools(singleAgent) {
    if (!singleAgent) {
        return [createTaskTool, decomposeTaskTool, updateTaskTool, taskInfoTool];
    }
    return [createTaskTool, decomposeTaskTool, updateTaskTool, taskInfoTool, currentTaskTool];
}
export function toolHandlers() {
    return {
        [CREATE_TASK]: {
            handler: handleCreateTask,
            schema: CreateTaskArgsSchema,
        },
        [DECOMPOSE_TASK]: {
            handler: handleDecomposeTask,
            schema: DecomposeTaskArgsSchema,
        },
        [UPDATE_TASK]: {
            handler: handleUpdateTask,
            schema: UpdateTaskArgsSchema,
        },
        [TASK_INFO]: {
            handler: handleTaskInfo,
            schema: TaskInfoArgsSchema,
        },
        [CURRENT_TASK]: {
            handler: handleCurrentTask,
            schema: CurrentTaskArgsSchema,
        },
    };
}
