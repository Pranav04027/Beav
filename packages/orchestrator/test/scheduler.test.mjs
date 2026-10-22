import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '@beav/core/db';
import { createTaskStore } from '@beav/core/task-store';
import { monitorPullRequests, recoverExecutions } from '../dist/tick.js';

function setup() {
  const db = openDatabase(':memory:');
  const store = createTaskStore(db.database);
  store.saveIssues(
    [
      {
        githubIssueId: 1,
        githubIssueNumber: 1,
        htmlUrl: 'https://example.com/1',
        repoOwner: 'owner',
        repoName: 'repo',
        issueTitle: 'issue',
        body: null,
      },
    ],
    1,
  );
  const task = store.claimPendingTask(store.list()[0].id, 10);
  store.markRunning(task, 123, 10);
  return { ...db, store, task };
}

test('stale detection covers the first-heartbeat gap, retries once and restarts as pending', async () => {
  const { close, store, task } = setup();
  try {
    let stopped = 0;
    const context = {
      config: { thresholdMs: 45, workspaceRoot: '/tmp/beav-unused-workspaces' },
      store,
      workers: {
        stop: async () => {
          stopped++;
        },
        has: () => false,
      },
    };
    await recoverExecutions(context, false, 100);
    assert.equal(stopped, 1);
    assert.equal(store.get(task.id).status, 'crashed');
    assert.equal(store.get(task.id).retryCount, 1);
    await recoverExecutions(context, false, 101);
    assert.equal(stopped, 1);
    await recoverExecutions(context, false, 20100);
    assert.equal(store.get(task.id).status, 'pending');
    assert.equal(store.get(task.id).claimedAt, null);
  } finally {
    close();
  }
});

test('startup recovery restarts both claimed and running executions', async () => {
  const { close, store, task } = setup();
  try {
    const context = {
      config: {
        thresholdMs: 999999,
        workspaceRoot: '/tmp/beav-unused-workspaces',
      },
      store,
      workers: { stop: async () => {}, has: () => false },
    };
    await recoverExecutions(context, true, 11);
    assert.equal(store.get(task.id).status, 'crashed');
  } finally {
    close();
  }
});

for (const [state, expected] of [
  ['passed', 'verifying'],
  ['pending', 'verifying'],
  ['no-checks', 'verifying'],
  ['failed', 'failed'],
  ['closed', 'failed'],
  ['merged', undefined],
]) {
  test('PR monitoring preserves existing behavior: ' + state, async () => {
    const { close, store, task } = setup();
    try {
      store.markVerifying(
        task,
        { prNumber: 1, prUrl: 'https://example.com/pr/1' },
        20,
      );
      await monitorPullRequests({
        store,
        github: { checkPullRequest: async () => state },
      });
      assert.equal(store.get(task.id)?.status, expected);
      assert.equal(store.retryable(Number.MAX_SAFE_INTEGER).length, 0);
    } finally {
      close();
    }
  });
}

test('a GitHub outage leaves verification state intact', async () => {
  const { close, store, task } = setup();
  try {
    store.markVerifying(
      task,
      { prNumber: 1, prUrl: 'https://example.com/pr/1' },
      20,
    );
    await monitorPullRequests({
      store,
      github: {
        checkPullRequest: async () => {
          throw new Error('offline');
        },
      },
    });
    assert.equal(store.get(task.id).status, 'verifying');
  } finally {
    close();
  }
});

test('legacy running rows with a null heartbeat recover using startedAt', async () => {
  const { close, database, store, task } = setup();
  try {
    database.run('UPDATE tasks SET lastHeartbeat = NULL');
    await recoverExecutions(
      {
        store,
        config: {
          thresholdMs: 45,
          workspaceRoot: '/tmp/beav-unused-workspaces',
        },
        workers: { stop: async () => {}, has: () => false },
      },
      false,
      100,
    );
    assert.equal(store.get(task.id).status, 'crashed');
  } finally {
    close();
  }
});
