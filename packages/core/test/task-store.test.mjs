import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { openDatabase } from '../dist/db.js';
import { createTaskStore } from '../dist/task-store.js';
import {
  assertAllowedTransition,
  taskStatuses,
} from '../dist/state-machine.js';

export const issue = {
  githubIssueId: 1,
  githubIssueNumber: 1,
  issueTitle: 'Fix bug',
  body: 'Details',
  htmlUrl: 'https://github.com/test/repo/issues/1',
  repoOwner: 'test',
  repoName: 'repo',
};

test('saves valid issues once and preserves existing schema and diagnostics', () => {
  const db = openDatabase(':memory:');
  try {
    const store = createTaskStore(db.database);
    assert.equal(store.saveIssues([issue, issue]), 1);
    assert.equal(store.list().length, 1);
    assert.match(store.list()[0].id, /^[0-9a-f-]{36}$/);
    assert.throws(() =>
      store.saveIssues([{ ...issue, githubIssueNumber: -1 }]),
    );
    assert.equal(store.list().length, 1);
  } finally {
    db.close();
  }
});

test('WAL database allows only one owner of competing conditional claims', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'beav-claims-'));
  const filename = path.join(directory, 'tasks.db');
  const db = openDatabase(filename);
  try {
    assert.equal(db.database.all('PRAGMA journal_mode')[0].journal_mode, 'wal');
    const store = createTaskStore(db.database);
    store.saveIssues([issue]);
    const task = store.list()[0];
    const module = new URL('../dist/task-store.js', import.meta.url).href;
    const databaseModule = new URL('../dist/db.js', import.meta.url).href;
    const gate = new SharedArrayBuffer(4);
    const runClaim = () =>
      new Promise((resolve, reject) => {
        const worker = new Worker(
          "const { parentPort, workerData } = require('node:worker_threads');" +
            '(async () => { const { openDatabase } = await import(workerData.databaseModule);' +
            'const { createTaskStore } = await import(workerData.module);' +
            "const db = openDatabase(workerData.filename); parentPort.postMessage('ready');" +
            'Atomics.wait(new Int32Array(workerData.gate), 0, 0);' +
            'const task = createTaskStore(db.database).claimPendingTask(workerData.id);' +
            'db.close(); parentPort.postMessage(!!task); })().catch(e => { throw e; });',
          {
            eval: true,
            workerData: { filename, module, databaseModule, id: task.id, gate },
          },
        );
        worker.once('error', reject);
        worker.on('message', (message) => {
          if (message === 'ready') {
            ready++;
            if (ready === 2) {
              Atomics.store(new Int32Array(gate), 0, 1);
              Atomics.notify(new Int32Array(gate), 0);
            }
          } else resolve(message);
        });
      });
    let ready = 0;
    assert.equal(
      (await Promise.all([runClaim(), runClaim()])).filter(Boolean).length,
      1,
    );
    assert.equal(store.get(task.id).status, 'claimed');
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('claim ownership guards running, heartbeat and duplicate completion updates', () => {
  const db = openDatabase(':memory:');
  try {
    const store = createTaskStore(db.database);
    store.saveIssues([issue]);
    const task = store.claimPendingTask(store.list()[0].id, 100);
    assert.equal(store.claimPendingTask(task.id), undefined);
    const running = store.markRunning(task, 123, 110);
    assert.equal(running.lastHeartbeat, 110);
    assert.equal(store.recordHeartbeat(task, 109), undefined);
    assert.ok(store.recordHeartbeat(task, 120));
    const pr = { prNumber: 12, prUrl: 'https://github.com/test/repo/pull/12' };
    assert.ok(store.markVerifying(task, pr, 130));
    assert.equal(store.markVerifying(task, pr, 131), undefined);
    assert.equal(store.recordHeartbeat(task, 140), undefined);
    assert.equal(store.activeCount(), 1); // verifying still consumes capacity
    assert.ok(store.recordCompletion(store.get(task.id)));
    assert.equal(store.get(task.id), undefined); // merged tasks still get deleted
  } finally {
    db.close();
  }
});

test('failure state and diagnostic log commit together; old attempts cannot update retries', () => {
  const db = openDatabase(':memory:');
  try {
    const store = createTaskStore(db.database);
    store.saveIssues([issue]);
    const old = store.claimPendingTask(store.list()[0].id, 100);
    store.markRunning(old, 123, 110);
    const failure = {
      status: 'failed',
      retryCount: 1,
      nextRetryAt: 200,
      error: 'agent: failure',
      ts: 120,
    };
    assert.ok(store.recordFailure(old, failure));
    assert.equal(store.recordFailure(old, failure), undefined);
    assert.equal(store.logs(old.id).length, 1);
    const retry = store.retryable(200)[0];
    store.requeue(retry);
    const next = store.claimPendingTask(old.id, 201);
    store.markRunning(next, 124, 202);
    assert.equal(store.recordHeartbeat(old, 300), undefined);
    assert.equal(store.recordThread(old, 'old-thread', 'old-turn'), undefined);
    assert.equal(
      store.markVerifying(
        old,
        { prNumber: 3, prUrl: 'https://example.com/pr/3' },
        300,
      ),
      undefined,
    );
    assert.equal(store.recordFailure(old, failure), undefined);
    assert.equal(store.get(old.id).status, 'running');
    assert.equal(store.get(old.id).retryCount, 1);
  } finally {
    db.close();
  }
});

test('failure rolls back when the diagnostic insert fails', () => {
  const db = openDatabase(':memory:');
  try {
    const store = createTaskStore(db.database);
    store.saveIssues([issue]);
    const task = store.claimPendingTask(store.list()[0].id);
    store.markRunning(task, 1);
    db.database.run(
      "CREATE TRIGGER reject_log BEFORE INSERT ON taskLogs BEGIN SELECT RAISE(ABORT, 'reject'); END",
    );
    assert.throws(
      () =>
        store.recordFailure(task, {
          status: 'failed',
          retryCount: 1,
          nextRetryAt: null,
          error: 'failure',
          ts: 1,
        }),
      /reject/,
    );
    assert.equal(store.get(task.id).status, 'running');
    assert.equal(store.get(task.id).retryCount, 0);
  } finally {
    db.close();
  }
});

test('seven-state rules reject invalid jumps', () => {
  assert.equal(taskStatuses.length, 7);
  assert.doesNotThrow(() => assertAllowedTransition('failed', 'pending'));
  assert.throws(() => assertAllowedTransition('pending', 'done'));
});
