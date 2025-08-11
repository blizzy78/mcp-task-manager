export class TaskDB {
    singleAgent;
    store = new Map();
    currentInProgressTask;
    constructor(singleAgent = false) {
        this.singleAgent = singleAgent;
    }
    set(taskID, task) {
        this.store.set(taskID, task);
    }
    get(taskID) {
        return this.store.get(taskID);
    }
    // TODO: this could be more efficient, but we're only dealing with a handful of tasks here
    getAllInTree(taskID) {
        const resultIDs = [taskID];
        for (;;) {
            let addedMore = false;
            for (const id of [...resultIDs]) {
                const task = this.get(id);
                for (const dependsOnTaskID of task.dependsOnTaskIDs) {
                    if (resultIDs.includes(dependsOnTaskID)) {
                        continue;
                    }
                    resultIDs.push(dependsOnTaskID);
                    addedMore = true;
                }
                const dependingOnTaskIDs = Array.from(this.store.values())
                    .filter((t) => t.dependsOnTaskIDs.includes(id))
                    .map((t) => t.taskID);
                for (const dependingOnTaskID of dependingOnTaskIDs) {
                    if (resultIDs.includes(dependingOnTaskID)) {
                        continue;
                    }
                    resultIDs.push(dependingOnTaskID);
                    addedMore = true;
                }
            }
            if (!addedMore) {
                break;
            }
        }
        return resultIDs.map((id) => this.get(id));
    }
    get isSingleAgent() {
        return this.singleAgent;
    }
    getCurrentInProgressTask() {
        return this.singleAgent ? this.currentInProgressTask : undefined;
    }
    setCurrentInProgressTask(taskID) {
        if (this.singleAgent) {
            this.currentInProgressTask = taskID;
        }
    }
}
