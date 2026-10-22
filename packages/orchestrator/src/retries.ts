import type { Task, TaskStore } from '@beav/core';
import type { FailureKind } from '@beav/core/worker-events';

export function recordExecutionFailure(
  store: TaskStore,
  task: Task,
  kind: FailureKind,
  error: string,
  now = Date.now(),
) {
  const retryCount = (task.retryCount ?? 0) + 1;
  const exhausted = retryCount >= (task.maxRetries ?? 0);
  const crashed = kind === 'crash' || kind === 'launch';
  // Preserve the old stale-worker rule: exhausted running tasks become failed.
  const status =
    crashed && !(exhausted && task.status === 'running') ? 'crashed' : 'failed';
  return store.recordFailure(task, {
    status,
    retryCount,
    nextRetryAt: exhausted ? null : now + 10_000 * 2 ** retryCount,
    error: kind + ': ' + error,
    ts: now,
  });
}
