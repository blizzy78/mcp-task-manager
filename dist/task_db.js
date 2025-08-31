import { DoneStatus, FailedStatus } from './tasks.js';
export class TaskDB {
    store = new Map();
    currentTaskID = null;
    set(taskID, task) {
        this.store.set(taskID, task);
    }
    get(taskID) {
        return this.store.get(taskID);
    }
    setCurrentTask(taskID) {
        this.currentTaskID = taskID;
    }
    getCurrentTask() {
        return this.currentTaskID;
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
    incompleteTasksInTree(taskID) {
        const incompleteTasks = this.getAllInTree(taskID).filter((task) => task.status !== DoneStatus && task.status !== FailedStatus);
        const taskMap = new Map();
        const inDegree = new Map();
        for (const task of incompleteTasks) {
            taskMap.set(task.taskID, task);
            const incompleteDepCount = task.dependsOnTaskIDs.filter((depId) => incompleteTasks.some((t) => t.taskID === depId)).length;
            inDegree.set(task.taskID, incompleteDepCount);
        }
        const result = [];
        const queue = [];
        for (const [taskID, degree] of inDegree.entries()) {
            if (degree > 0) {
                continue;
            }
            queue.push(taskID);
        }
        while (queue.length > 0) {
            queue.sort((a, b) => {
                const taskA = taskMap.get(a);
                const taskB = taskMap.get(b);
                if (taskA.criticalPath && !taskB.criticalPath) {
                    return -1;
                }
                if (!taskA.criticalPath && taskB.criticalPath) {
                    return 1;
                }
                return 0;
            });
            const firstTaskID = queue.shift();
            const firstTask = taskMap.get(firstTaskID);
            result.push(firstTask);
            for (const task of incompleteTasks) {
                if (!task.dependsOnTaskIDs.includes(firstTaskID)) {
                    continue;
                }
                const newDegree = inDegree.get(task.taskID) - 1;
                inDegree.set(task.taskID, newDegree);
                if (newDegree > 0) {
                    continue;
                }
                queue.push(task.taskID);
            }
        }
        return result;
    }
}
