export type WorkerEvent =
   {
      type: 'heartbeat';
      taskId: string;
      ts: number;
    }
  | {
      type: 'log';
      taskId: string;
      stream: 'system';
      line: string;
      ts: number;
    }
  | {
      type: 'thread-state';
      taskId: string;
      threadId: string;
      turnId: string;
    }
  | {
      type: 'failed';
      taskId: string;
      error: string;
      ts: number;
    }
  | {
      type: 'completed';
      taskId: string;
      completedAt: number;
      prNumber: number;
      prUrl: string;
    };

export function isWorkerEvent(value: unknown): value is WorkerEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<WorkerEvent> & { type?: string };

  switch (event.type) {
    case 'heartbeat':
      return (
        typeof event.taskId === 'string' &&
        typeof event.ts === 'number'
      );
    case 'log':
      return (
        typeof event.taskId === 'string' &&
        event.stream === 'system' &&
        typeof event.line === 'string' &&
        typeof event.ts === 'number'
      );
    case 'thread-state':
      return (
        typeof event.taskId === 'string' &&
        typeof event.threadId === 'string' &&
        typeof event.turnId === 'string'
      );
    case 'failed':
      return (
        typeof event.taskId === 'string' &&
        typeof event.error === 'string' &&
        typeof event.ts === 'number'
      );
    case 'completed':
      return (
        typeof event.taskId === 'string' &&
        typeof event.completedAt === 'number' &&
        typeof event.prNumber === 'number' &&
        typeof event.prUrl === 'string'
      );
    default:
      return false;
  }
}
