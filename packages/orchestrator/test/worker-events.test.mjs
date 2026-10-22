import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '@beav/core/db';
import { createTaskStore } from '@beav/core/task-store';
import { createWorkerReports } from '../dist/worker-events.js';
import { recordExecutionFailure } from '../dist/retries.js';

function setup() {
  const db = openDatabase(':memory:');
  const store = createTaskStore(db.database);
  store.saveIssues([
    {
      githubIssueId: 1,
      githubIssueNumber: 1,
      htmlUrl: 'https://example.com/issue/1',
      repoOwner: 'owner',
      repoName: 'repo',
      issueTitle: 'Issue',
      body: null,
    },
  ]);
  const task = store.claimPendingTask(store.list()[0].id, 10);
  const running = store.markRunning(task, 123, 11);
  return {
    ...db,
    store,
    task: running,
    reports: createWorkerReports(running, store),
  };
}

test('persists worker heartbeat and thread state updates', async () => {
  const { close, store, task, reports } = setup();
  try {
    await reports.handle({
      type: 'thread-state',
      taskId: task.id,
      threadId: 'thread-1',
      turnId: 'turn-1',
    });
    await reports.handle({ type: 'heartbeat', taskId: task.id, ts: 12345 });
    assert.equal(store.get(task.id).threadId, 'thread-1');
    assert.equal(store.get(task.id).lastHeartbeat, 12345);
  } finally {
    close();
  }
});

test('persists failure and diagnostic once, using the parent retry policy', async () => {
  const { close, store, task, reports } = setup();
  try {
    const message = {
      type: 'failed',
      taskId: task.id,
      kind: 'agent',
      error: 'boom',
      ts: 42,
    };
    assert.equal(await reports.handle(message), true);
    assert.equal(await reports.handle(message), false);
    assert.equal(store.logs(task.id).length, 1);
    assert.equal(store.get(task.id).status, 'failed');
    assert.equal(store.get(task.id).retryCount, 1);
    assert.equal(store.get(task.id).nextRetryAt, 20042);
    assert.equal(
      recordExecutionFailure(store, task, 'crash', 'exit'),
      undefined,
    );
  } finally {
    close();
  }
});

test('completion preserves PR metadata, clears agent state and ignores late failure', async () => {
  const { close, store, task, reports } = setup();
  try {
    const pr = {
      type: 'completed',
      taskId: task.id,
      completedAt: 777,
      prNumber: 10,
      prUrl: 'https://example.com/pr/10',
    };
    assert.equal(await reports.handle(pr), true);
    assert.equal(await reports.handle(pr), false);
    assert.equal(
      await reports.handle({
        type: 'failed',
        taskId: task.id,
        kind: 'agent',
        error: 'late',
        ts: 800,
      }),
      false,
    );
    assert.equal(store.get(task.id).status, 'verifying');
    assert.equal(store.get(task.id).prNumber, 10);
    assert.equal(store.get(task.id).threadId, null);
    assert.equal(store.get(task.id).retryCount, 0);
  } finally {
    close();
  }
});

test('worker reports run in order and reject malformed or mismatched messages', async () => {
  const { close, store, task, reports } = setup();
  try {
    const sends = [1, 2, 3].map((n) =>
      reports.handle({
        type: 'log',
        taskId: task.id,
        stream: 'system',
        line: String(n),
        ts: n,
      }),
    );
    await Promise.all(sends);
    assert.deepEqual(
      store.logs(task.id).map((log) => log.line),
      ['1', '2', '3'],
    );
    assert.equal(
      await reports.handle({ type: 'completed', taskId: task.id }),
      false,
    );
    assert.equal(
      await reports.handle({
        type: 'heartbeat',
        taskId: 'another-task',
        ts: 100,
      }),
      false,
    );
    await reports.drain();
  } finally {
    close();
  }
});

test('retry limit comes from the saved task, not a hardcoded maximum', () => {
  const { close, database, store, task } = setup();
  try {
    database.run('UPDATE tasks SET max_retries = 1');
    const failed = recordExecutionFailure(
      store,
      store.get(task.id),
      'agent',
      'failed',
      100,
    );
    assert.equal(failed.nextRetryAt, null);
    assert.equal(store.retryable(999999).length, 0);
  } finally {
    close();
  }
});
