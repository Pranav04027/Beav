import assert from 'node:assert/strict';
import test from 'node:test';
import { taskLogs, tasks } from '@beav/core/schema';
import { handleWorkerMessage } from '../dist/worker-event-store.js';

function createRecorder() {
  const operations = [];

  const makeWriteApi = () => ({
    insert(table) {
      return {
        values(payload) {
          operations.push({ kind: 'insert', table, payload });
          return Promise.resolve();
        },
      };
    },
    update(table) {
      return {
        set(payload) {
          return {
            where(whereClause) {
              operations.push({ kind: 'update', table, payload, whereClause });
              return Promise.resolve();
            },
          };
        },
      };
    },
  });

  const writeApi = makeWriteApi();

  return {
    operations,
    db: {
      ...writeApi,
      transaction(callback) {
        return callback(makeWriteApi());
      },
    },
  };
}

test('persists worker heartbeat and thread state updates', async () => {
  const { operations, db } = createRecorder();

  await handleWorkerMessage({
    type: 'thread-state',
    taskId: 'task-1',
    threadId: 'thread-1',
    turnId: 'turn-1',
  }, db);
  await handleWorkerMessage({
    type: 'heartbeat',
    taskId: 'task-1',
    ts: 12345,
  }, db);

  assert.equal(operations.length, 2);
  assert.equal(operations[0]?.kind, 'update');
  assert.equal(operations[0]?.table, tasks);
  assert.deepEqual(operations[0]?.payload, {
    threadId: 'thread-1',
    turnId: 'turn-1',
  });
  assert.equal(operations[1]?.kind, 'update');
  assert.equal(operations[1]?.table, tasks);
  assert.deepEqual(operations[1]?.payload, {
    lastHeartbeat: 12345,
  });
});

test('persists worker failure as a log entry and failed task state', async () => {
  const { operations, db } = createRecorder();

  await handleWorkerMessage({
    type: 'failed',
    taskId: 'task-2',
    error: 'boom',
    ts: 42,
  }, db);

  assert.equal(operations.length, 2);
  assert.equal(operations[0]?.kind, 'insert');
  assert.equal(operations[0]?.table, taskLogs);
  assert.deepEqual(operations[0]?.payload, {
    taskId: 'task-2',
    stream: 'system',
    line: 'worker error: boom',
    ts: 42,
  });
  assert.equal(operations[1]?.kind, 'update');
  assert.equal(operations[1]?.table, tasks);
  assert.deepEqual(operations[1]?.payload, {
    status: 'failed',
    workspacePath: null,
    threadId: null,
    turnId: null,
    workerPid: null,
    lastHeartbeat: null,
  });
});

test('persists worker completion as verifying state cleanup', async () => {
  const { operations, db } = createRecorder();

  await handleWorkerMessage({
    type: 'completed',
    taskId: 'task-3',
    completedAt: 777,
  }, db);

  assert.equal(operations.length, 1);
  assert.equal(operations[0]?.kind, 'update');
  assert.equal(operations[0]?.table, tasks);
  assert.deepEqual(operations[0]?.payload, {
    status: 'verifying',
    completedAt: 777,
    workspacePath: null,
    threadId: null,
    turnId: null,
    workerPid: null,
    lastHeartbeat: null,
  });
});
