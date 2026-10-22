import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  access,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDatabase } from '@beav/core/db';
import { createTaskStore } from '@beav/core/task-store';
import { workspacePath } from '@beav/core/workspace';
import { createWorkerManager } from '../dist/launcher.js';

async function setup(mode, count = 1) {
  const directory = await mkdtemp(path.join(tmpdir(), 'beav-processes-'));
  const bin = path.join(directory, 'bin');
  const root = path.join(directory, 'workspaces');
  await mkdir(bin);
  await mkdir(root);
  const fakeCodex = await readFile(
    new URL('../../worker/test/fixtures/codex.mjs', import.meta.url),
    'utf8',
  );
  await writeFile(path.join(bin, 'codex'), fakeCodex, { mode: 0o755 });
  await writeFile(
    path.join(bin, 'git'),
    '#!/usr/bin/env node\nprocess.exit(process.argv[2] === "diff" ? 1 : 0);\n',
    { mode: 0o755 },
  );
  await writeFile(
    path.join(bin, 'gh'),
    '#!/usr/bin/env node\nif (process.argv[3] !== "list") console.log("https://example.com/pr/12");\n',
    { mode: 0o755 },
  );
  const previousPath = process.env.PATH;
  const previousMode = process.env.BEAV_TEST_AGENT_MODE;
  process.env.PATH = bin + path.delimiter + previousPath;
  process.env.BEAV_TEST_AGENT_MODE = mode;
  const db = openDatabase(':memory:');
  const store = createTaskStore(db.database);
  store.saveIssues(
    Array.from({ length: count }, (_, n) => ({
      githubIssueId: n + 1,
      githubIssueNumber: n + 1,
      htmlUrl: 'https://example.com/issue/' + (n + 1),
      repoOwner: 'owner',
      repoName: 'repo',
      issueTitle: 'Issue',
      body: null,
    })),
  );
  const tasks = [];
  for (const pending of store.list()) {
    const claimed = store.claimPendingTask(pending.id);
    const directory = workspacePath(claimed.id, root);
    await mkdir(directory);
    tasks.push(store.setWorkspace(claimed, directory));
  }
  const workers = createWorkerManager(store, root);
  return {
    store,
    tasks,
    workers,
    root,
    async cleanup() {
      await workers.stopAll();
      db.close();
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
      if (previousMode === undefined) delete process.env.BEAV_TEST_AGENT_MODE;
      else process.env.BEAV_TEST_AGENT_MODE = previousMode;
      await rm(directory, { recursive: true, force: true });
    },
  };
}

test(
  'two independent Node workers report through IPC, receive durable acknowledgements and clean up',
  { timeout: 15000 },
  async () => {
    const context = await setup('success', 2);
    try {
      const pids = await Promise.all(
        context.tasks.map((task) => context.workers.launch(task)),
      );
      assert.notEqual(pids[0], pids[1]);
      await Promise.all(
        context.tasks.map((task) => context.workers.wait(task.id)),
      );
      for (const task of context.tasks) {
        const saved = context.store.get(task.id);
        assert.equal(saved.status, 'verifying');
        assert.equal(saved.prNumber, 12);
        assert.equal(saved.retryCount, 0);
        assert.equal(saved.workspacePath, null);
        assert.deepEqual(
          context.store.logs(task.id).map((log) => log.line),
          ['working'],
        );
        await assert.rejects(
          access(workspacePath(task.id, context.root)),
          /ENOENT/,
        );
      }
    } finally {
      await context.cleanup();
    }
  },
);

test(
  'agent failure followed by worker exit increments retries once',
  { timeout: 15000 },
  async () => {
    const context = await setup('exit');
    try {
      const [task] = context.tasks;
      await context.workers.launch(task);
      await context.workers.wait(task.id);
      assert.equal(context.store.get(task.id).status, 'failed');
      assert.equal(context.store.get(task.id).retryCount, 1);
      assert.equal(
        context.store
          .logs(task.id)
          .filter((log) => log.line.startsWith('agent:')).length,
        1,
      );
    } finally {
      await context.cleanup();
    }
  },
);

test(
  'unexpected worker death is recovered as a crash with cleanup',
  { timeout: 15000 },
  async () => {
    const context = await setup('hang');
    try {
      const [task] = context.tasks;
      const pid = await context.workers.launch(task);
      process.kill(pid, 'SIGKILL');
      await context.workers.wait(task.id);
      assert.equal(context.store.get(task.id).status, 'crashed');
      assert.equal(context.store.get(task.id).retryCount, 1);
      assert.equal(context.store.get(task.id).workspacePath, null);
      await assert.rejects(
        access(workspacePath(task.id, context.root)),
        /ENOENT/,
      );
    } finally {
      await context.cleanup();
    }
  },
);

test(
  'shutdown stops a running worker and its process group without duplicate recovery',
  { timeout: 15000 },
  async () => {
    const context = await setup('hang');
    try {
      const [task] = context.tasks;
      await context.workers.launch(task);
      await context.workers.stopAll();
      assert.equal(context.workers.has(task.id), false);
      assert.equal(context.store.get(task.id).retryCount, 1);
      assert.ok(
        ['failed', 'crashed'].includes(context.store.get(task.id).status),
      );
    } finally {
      await context.cleanup();
    }
  },
);

test(
  'startup recovery does not kill an unrelated process that reused a saved PID',
  { timeout: 15000 },
  async () => {
    const context = await setup('success');
    try {
      const [task] = context.tasks;
      await context.workers.stop({ ...task, workerPid: process.pid });
      assert.equal(process.kill(process.pid, 0), true);
      assert.equal(context.store.get(task.id).status, 'claimed');
    } finally {
      await context.cleanup();
    }
  },
);

test(
  'failure to persist running ownership kills the waiting child without agent execution',
  { timeout: 15000 },
  async () => {
    const context = await setup('success');
    const workers = createWorkerManager(
      {
        ...context.store,
        markRunning: () => {
          throw new Error('database unavailable');
        },
      },
      context.root,
    );
    try {
      const [task] = context.tasks;
      await assert.rejects(workers.launch(task), /database unavailable/);
      assert.equal(workers.has(task.id), false);
      assert.equal(context.store.get(task.id).status, 'crashed');
      assert.equal(context.store.get(task.id).retryCount, 1);
      assert.equal(
        context.store.logs(task.id).some((log) => log.line === 'working'),
        false,
      );
    } finally {
      await workers.stopAll();
      await context.cleanup();
    }
  },
);
