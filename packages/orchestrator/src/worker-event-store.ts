import { eq } from 'drizzle-orm';
import { taskLogs, tasks } from '@beav/core/schema';
import { type WorkerEvent, isWorkerEvent } from '@beav/core/worker-events';

export async function persistWorkerEvent(event: WorkerEvent, database: any) {
  switch (event.type) {
    case 'heartbeat':
      await database
        .update(tasks)
        .set({ lastHeartbeat: event.ts })
        .where(eq(tasks.id, event.taskId));
      return;
    case 'log':
      await database.insert(taskLogs).values({
        taskId: event.taskId,
        stream: event.stream,
        line: event.line,
        ts: event.ts,
      });
      return;
    case 'thread-state':
      await database
        .update(tasks)
        .set({
          threadId: event.threadId,
          turnId: event.turnId,
        })
        .where(eq(tasks.id, event.taskId));
      return;
    case 'failed':
      await database.transaction(async (tx: any) => {
        await tx.insert(taskLogs).values({
          taskId: event.taskId,
          stream: 'system',
          line: `worker error: ${event.error}`,
          ts: event.ts,
        });

        await tx
          .update(tasks)
          .set({
            status: 'failed',
            workspacePath: null,
            threadId: null,
            turnId: null,
            workerPid: null,
            lastHeartbeat: null,
          })
          .where(eq(tasks.id, event.taskId));
      });
      return;
    case 'completed':
      await database
        .update(tasks)
        .set({
          status: 'verifying',
          completedAt: event.completedAt,
          workspacePath: null,
          threadId: null,
          turnId: null,
          workerPid: null,
          lastHeartbeat: null,
        })
        .where(eq(tasks.id, event.taskId));
      return;
  }
}

export async function handleWorkerMessage(message: unknown, database: any) {
  if (!isWorkerEvent(message)) {
    throw new Error('Received invalid worker IPC message');
  }

  await persistWorkerEvent(message, database);
}
