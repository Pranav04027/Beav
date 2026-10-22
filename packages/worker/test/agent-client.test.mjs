import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createAgentClient } from '../dist/agent-client.js';
import { runTask } from '../dist/run-task.js';

const fixture = fileURLToPath(new URL('./fixtures/codex.mjs', import.meta.url));
const task = {
  id: 'task-1',
  githubIssueNumber: 1,
  issueTitle: 'Fix bug',
  body: 'details',
  workspacePath: '/tmp/beav-agent-test/task-1',
  workspaceRoot: '/tmp/beav-agent-test',
  claimedAt: 1,
  retryCount: 0,
};
const client = (mode) =>
  createAgentClient(() =>
    spawn(process.execPath, [fixture, mode], { stdio: 'pipe' }),
  );

for (const mode of ['success', 'early', 'complete-exit']) {
  test(
    'awaits correlated RPC and one completion with fragmented messages: ' +
      mode,
    { timeout: 5000 },
    async () => {
      const agent = client(mode);
      const progress = [];
      const threads = [];
      try {
        await agent.fixIssue(task, {
          signal: new AbortController().signal,
          onProgress: (text) => {
            progress.push(text);
          },
          onThread: (...ids) => {
            threads.push(ids);
          },
        });
        assert.deepEqual(progress, ['working']);
        assert.deepEqual(threads, [['thread-1', 'turn-1']]);
      } finally {
        await agent.close();
        await agent.close();
      }
    },
  );
}

for (const [mode, pattern] of [
  ['exit', /Codex exited/],
  ['failed', /status: failed/],
  ['cancelled', /status: interrupted/],
  ['rpc-error', /initialization rejected/],
]) {
  test('rejects execution on ' + mode, { timeout: 5000 }, async () => {
    const agent = client(mode);
    try {
      await assert.rejects(
        agent.fixIssue(task, {
          signal: new AbortController().signal,
          onProgress: () => {},
          onThread: () => {},
        }),
        pattern,
      );
    } finally {
      await agent.close();
    }
  });
}

test(
  'spawn failure rejects RPC and cleanup does not hang',
  { timeout: 5000 },
  async () => {
    const agent = createAgentClient(() =>
      spawn('/definitely-missing-beav-codex', [], { stdio: 'pipe' }),
    );
    await assert.rejects(
      agent.fixIssue(task, {
        signal: new AbortController().signal,
        onProgress: () => {},
        onThread: () => {},
      }),
      /ENOENT/,
    );
    await agent.close();
  },
);

test(
  'duplicate agent completion publishes and reports once; cleanup follows result',
  { timeout: 5000 },
  async () => {
    const sequence = [];
    let publications = 0;
    const result = await runTask(task, {
      agent: client('success'),
      report: async (event) => {
        sequence.push(event.type);
      },
      publish: async () => {
        publications++;
        return { prNumber: 1, prUrl: 'https://example.com/pr/1' };
      },
      cleanup: async () => {
        sequence.push('cleanup');
      },
    });
    assert.equal(result, true);
    assert.equal(publications, 1);
    assert.equal(sequence.filter((event) => event === 'completed').length, 1);
    assert.equal(sequence.includes('failed'), false);
    assert.equal(sequence.at(-1), 'cleanup');
  },
);

test(
  'worker timeout rejects execution, reports once and cleans up',
  { timeout: 5000 },
  async () => {
    const events = [];
    let cleaned = 0;
    const result = await runTask(task, {
      agent: client('hang'),
      timeoutMs: 100,
      heartbeatMs: 10,
      report: async (event) => {
        events.push(event);
      },
      publish: async () => {
        throw new Error('must not publish');
      },
      cleanup: async () => {
        cleaned++;
      },
    });
    assert.equal(result, false);
    assert.equal(events.filter((event) => event.type === 'failed').length, 1);
    assert.equal(
      events.find((event) => event.type === 'failed').kind,
      'timeout',
    );
    assert.equal(
      events.some((event) => event.type === 'completed'),
      false,
    );
    assert.equal(cleaned, 1);
  },
);

test('publication failure remains distinct from agent failure', async () => {
  const events = [];
  const result = await runTask(task, {
    agent: { fixIssue: async () => {}, close: async () => {} },
    report: async (event) => {
      events.push(event);
    },
    publish: async () => {
      throw new Error('push rejected');
    },
    cleanup: async () => {},
  });
  assert.equal(result, false);
  assert.equal(
    events.find((event) => event.type === 'failed').kind,
    'publication',
  );
});

test('failed final acknowledgement never causes a competing failure report', async () => {
  const events = [];
  let cleaned = false;
  const result = await runTask(task, {
    agent: { fixIssue: async () => {}, close: async () => {} },
    report: async (event) => {
      events.push(event.type);
      if (event.type === 'completed') throw new Error('ack lost');
    },
    publish: async () => ({ prNumber: 1, prUrl: 'https://example.com/pr/1' }),
    cleanup: async () => {
      cleaned = true;
    },
  });
  assert.equal(result, false);
  assert.equal(events.filter((event) => event === 'completed').length, 1);
  assert.equal(events.includes('failed'), false);
  assert.equal(cleaned, true);
});

test('cleanup failure after accepted completion does not create a failure report', async () => {
  const events = [];
  const result = await runTask(task, {
    agent: { fixIssue: async () => {}, close: async () => {} },
    report: async (event) => {
      events.push(event.type);
    },
    publish: async () => ({ prNumber: 1, prUrl: 'https://example.com/pr/1' }),
    cleanup: async () => {
      throw new Error('cleanup blocked');
    },
  });
  assert.equal(result, true);
  assert.equal(events.includes('failed'), false);
});

test('shutdown during publication cancels work without competing final results', async () => {
  const controller = new AbortController();
  const events = [];
  const result = await runTask(task, {
    signal: controller.signal,
    agent: { fixIssue: async () => {}, close: async () => {} },
    report: async (event) => {
      events.push(event);
    },
    publish: async (_task, signal) => {
      controller.abort(new Error('shutdown'));
      signal.throwIfAborted();
    },
    cleanup: async () => {},
  });
  assert.equal(result, false);
  assert.equal(events.filter((event) => event.type === 'failed').length, 1);
  assert.equal(
    events.find((event) => event.type === 'failed').kind,
    'shutdown',
  );
});
