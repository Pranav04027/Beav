import type { Task, TaskStore } from '@beav/core';
import { WorkerEventSchema } from '@beav/core/worker-events';
import * as logger from '@beav/core/logger';
import { recordExecutionFailure } from './retries.js';

export function handleWorkerMessage(
  message: unknown,
  task: Task,
  store: TaskStore,
): boolean {
  const parsed = WorkerEventSchema.safeParse(message);
  if (!parsed.success || parsed.data.taskId !== task.id) {
    logger.warn(
      'ipc',
      'Ignoring invalid or mismatched worker report for ' + task.id,
    );
    return false;
  }
  const event = parsed.data;
  switch (event.type) {
    case 'heartbeat':
      return !!store.recordHeartbeat(task, event.ts);
    case 'log':
      return store.recordLog(task, event.line, event.ts);
    case 'thread-state':
      return !!store.recordThread(task, event.threadId, event.turnId);
    case 'completed':
      return !!store.markVerifying(task, event, event.completedAt);
    case 'failed':
      return !!recordExecutionFailure(
        store,
        task,
        event.kind,
        event.error,
        event.ts,
      );
  }
}

// Each child has its own queue. A process exit is processed after its reports.
export function createWorkerReports(task: Task, store: TaskStore) {
  let queue = Promise.resolve();
  return {
    handle(message: unknown): Promise<boolean> {
      const result = queue.then(() =>
        handleWorkerMessage(message, task, store),
      );
      queue = result.then(
        () => {},
        (error) => {
          logger.error('ipc', 'Report persistence failed', error);
        },
      );
      return result;
    },
    drain: () => queue,
  };
}
