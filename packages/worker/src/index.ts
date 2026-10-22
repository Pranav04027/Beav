import { once } from 'node:events';
import {
  AssignedTaskSchema,
  WorkerAckSchema,
  type WorkerEvent,
} from '@beav/core/worker-events';
import * as logger from '@beav/core/logger';
import { runTask } from './run-task.js';

// IPC reports belong to the Node parent. Codex stdin/stdout lives in agent-client.
async function reportToParent(event: WorkerEvent): Promise<void> {
  if (!process.send || !process.connected)
    throw new Error('Worker requires a live parent IPC channel');
  const terminal = event.type === 'completed' || event.type === 'failed';
  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      process.removeListener('message', onMessage);
      if (error) reject(error);
      else resolve();
    };
    const onMessage = (message: unknown) => {
      const ack = WorkerAckSchema.safeParse(message);
      if (
        ack.success &&
        ack.data.taskId === event.taskId &&
        ack.data.event === event.type
      ) {
        finish(
          ack.data.accepted
            ? undefined
            : new Error('Parent rejected obsolete task result'),
        );
      }
    };
    const timer = setTimeout(
      () => finish(new Error('Parent did not acknowledge task result')),
      10_000,
    );
    if (terminal) process.on('message', onMessage);
    process.send!(event, (error) => {
      if (error) finish(error);
      else if (!terminal) finish();
    });
  });
}

async function main() {
  const task = AssignedTaskSchema.parse(
    JSON.parse(process.env.BEAV_WORKER_TASK ?? 'null'),
  );
  const controller = new AbortController();
  const stop = () =>
    controller.abort(new Error('Worker received shutdown signal'));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  process.once('disconnect', stop);
  try {
    // The parent confirms persisted running ownership before execution begins.
    const [message] = await once(process, 'message', {
      signal: controller.signal,
    });
    const start = message as { type?: string; taskId?: string } | null;
    if (start?.type !== 'start' || start.taskId !== task.id)
      throw new Error('Invalid worker start message');
    const succeeded = await runTask(task, {
      report: reportToParent,
      signal: controller.signal,
    });
    process.exitCode = succeeded ? 0 : 1;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    process.removeListener('disconnect', stop);
    if (process.connected) process.disconnect?.();
  }
}
void main().catch((error) => {
  logger.error('worker', 'Worker startup failed', error);
  process.exitCode = 1;
  if (process.connected) process.disconnect?.();
});
