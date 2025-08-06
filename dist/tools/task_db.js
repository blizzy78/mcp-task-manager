export class TaskDB {
    store = new Map();
    set(taskID, task) {
        this.store.set(taskID, task);
    }
    get(taskID) {
        return this.store.get(taskID);
    }
    getSubtasks(parentTaskID) {
        return Array.from(this.store.values()).filter((task) => task.parentTaskID === parentTaskID);
    }
}
