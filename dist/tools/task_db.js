import { randomUUID } from 'node:crypto';
import { TaskIDSchema } from './tasks.js';
export class TaskDB {
    store = new Map();
    set(taskID, task) {
        this.store.set(taskID, task);
    }
    get(taskID) {
        return this.store.get(taskID);
    }
}
export function newTaskID() {
    return TaskIDSchema.parse(randomUUID());
}
