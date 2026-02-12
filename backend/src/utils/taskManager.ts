import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import { TaskInfo, TaskResult, TaskStatus } from '../types/index.js';

class TaskManager {
  private tasks = new Map<string, TaskInfo>();
  private emitters = new Map<string, EventEmitter>();

  createTask(initial?: Partial<TaskInfo>): TaskInfo {
    const id = uuidv4();
    const info: TaskInfo = {
      id,
      status: 'queued',
      progress: 0,
      ...initial,
    };
    this.tasks.set(id, info);
    this.emitters.set(id, new EventEmitter());
    return info;
  }

  getTask(id: string): TaskInfo | undefined {
    return this.tasks.get(id);
  }

  getEmitter(id: string): EventEmitter | undefined {
    return this.emitters.get(id);
  }

  update(id: string, patch: Partial<TaskInfo>) {
    const cur = this.tasks.get(id);
    if (!cur) return;
    const next = { ...cur, ...patch } as TaskInfo;
    this.tasks.set(id, next);
    const em = this.emitters.get(id);
    if (em) em.emit('progress', next);
  }

  complete(id: string, result?: TaskResult) {
    this.update(id, { status: 'completed', progress: 100, result });
    const em = this.emitters.get(id);
    if (em) em.emit('complete', this.tasks.get(id));
  }

  error(id: string, message: string) {
    this.update(id, { status: 'error', error: message });
    const em = this.emitters.get(id);
    if (em) em.emit('error', this.tasks.get(id));
  }

  on(id: string, event: 'progress' | 'complete' | 'error', listener: (info: TaskInfo | undefined) => void) {
    const em = this.emitters.get(id);
    em?.on(event, listener);
  }

  off(id: string, event: 'progress' | 'complete' | 'error', listener: (info: TaskInfo | undefined) => void) {
    const em = this.emitters.get(id);
    em?.off(event, listener);
  }
}

export const tasks = new TaskManager();
