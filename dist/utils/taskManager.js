import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
class TaskManager {
    tasks = new Map();
    emitters = new Map();
    createTask(initial) {
        const id = uuidv4();
        const info = {
            id,
            status: 'queued',
            progress: 0,
            ...initial,
        };
        this.tasks.set(id, info);
        this.emitters.set(id, new EventEmitter());
        return info;
    }
    getTask(id) {
        return this.tasks.get(id);
    }
    getEmitter(id) {
        return this.emitters.get(id);
    }
    update(id, patch) {
        const cur = this.tasks.get(id);
        if (!cur)
            return;
        const next = { ...cur, ...patch };
        this.tasks.set(id, next);
        const em = this.emitters.get(id);
        if (em)
            em.emit('progress', next);
    }
    complete(id, result) {
        this.update(id, { status: 'completed', progress: 100, result });
        const em = this.emitters.get(id);
        if (em)
            em.emit('complete', this.tasks.get(id));
    }
    error(id, message) {
        this.update(id, { status: 'error', error: message });
        const em = this.emitters.get(id);
        if (em)
            em.emit('error', this.tasks.get(id));
    }
    on(id, event, listener) {
        const em = this.emitters.get(id);
        em?.on(event, listener);
    }
    off(id, event, listener) {
        const em = this.emitters.get(id);
        em?.off(event, listener);
    }
}
export const tasks = new TaskManager();
