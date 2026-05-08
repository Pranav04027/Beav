import { spawn, type ChildProcessByStdio } from 'node:child_process';
import fs from 'node:fs/promises';
import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { type Task, type WorkerEvent, logger } from '@beav/core';
import { createPR } from './gitcommands.js';

type WorkerProc = ChildProcessByStdio<Writable, Readable, Readable>;

// Lines from codex stderr to silently discard
const NOISE_PATTERNS = [
  /bubblewrap/i,
  /bwrap/i,
  /^\s*$/,
];

let rpcId = 0;
const nextId = (): number => ++rpcId;

const pending = new Map<number, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}>();

function readTaskFromEnv(): Task {
  const rawTask = process.env.BEAV_WORKER_TASK;

  if (!rawTask) {
    throw new Error('BEAV_WORKER_TASK is required');
  }

  const task = JSON.parse(rawTask) as Task;

  if (!task.id) {
    throw new Error('BEAV_WORKER_TASK is missing task.id');
  }

  if (!task.workspacePath) {
    throw new Error(`Task ${task.id} is missing workspacePath`);
  }

  return task;
}

function sendParentEvent(event: WorkerEvent): Promise<void> {
  if (typeof process.send !== 'function') {
    return Promise.reject(
      new Error('Worker must be started with an IPC channel'),
    );
  }

  return new Promise((resolve, reject) => {
    process.send?.(event, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function cleanupTask(proc: WorkerProc, task: Task, tag: string) {
  if (task.workspacePath) {
    logger.info(tag, `Cleaning up workspace`);
    await fs.rm(task.workspacePath, { recursive: true, force: true });
  }

  try {
    proc.kill('SIGKILL');
    logger.info(tag, 'Killed codex process');
  } catch (error) {
    logger.error(tag, 'Failed to kill worker child process', error);
  }
}

async function run(task: Task) {
  const tag = `worker:${task.id.slice(-8)}`;

  logger.info(tag, `Issue #${task.githubIssueNumber}: ${task.issueTitle}`);
  logger.info(tag, `Workspace: ${task.workspacePath}`);

  const proc: WorkerProc = spawn('codex', ['app-server'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Filter codex stderr — suppress known noise, pass real errors through
  readline.createInterface({ input: proc.stderr }).on('line', (line) => {
    if (NOISE_PATTERNS.some((p) => p.test(line))) return;
    logger.error(tag, `[codex] ${line}`);
  });
  const signalHandlers = new Map<NodeJS.Signals, () => void>();

  const rejectPending = (error: Error) => {
    for (const { reject } of pending.values()) {
      reject(error);
    }
    pending.clear();
  };

  const heartbeatInterval = setInterval(() => {
    void sendParentEvent({
      type: 'heartbeat',
      taskId: task.id,
      ts: Date.now(),
    }).catch((error) => {
      logger.error(tag, 'Heartbeat failed', error);
    });
  }, 15 * 1000);

  let completed = false;
  let cleanedUp = false;

  // Hard timeout: if the agent hasn't completed within 10 minutes, kill it.
  const WORKER_TIMEOUT_MS = 10 * 60 * 1000;
  const workerTimeout = setTimeout(() => {
    logger.error(tag, 'Worker timeout exceeded (10 min) — forcing failure');
    void finalizeFailure(new Error('Worker timeout exceeded')).finally(() => {
      process.exit(1);
    });
  }, WORKER_TIMEOUT_MS);

  const removeSignalHandlers = () => {
    for (const [signal, handler] of signalHandlers) {
      process.removeListener(signal, handler);
    }
    signalHandlers.clear();
  };

  const finalizeFailure = async (error: unknown) => {
    if (completed) return;
    completed = true;
    clearInterval(heartbeatInterval);
    clearTimeout(workerTimeout);
    removeSignalHandlers();

    const message = error instanceof Error ? error.message : String(error);
    logger.error(tag, `FAILED: ${message}`);

    try {
      await sendParentEvent({
        type: 'failed',
        taskId: task.id,
        error: message,
        ts: Date.now(),
      });
    } catch (sendError) {
      logger.error(tag, 'Failed to send worker failure event', sendError);
    } finally {
      if (!cleanedUp) {
        cleanedUp = true;
        try {
          await cleanupTask(proc, task, tag);
        } catch (cleanupError) {
          logger.error(tag, 'Cleanup after failure failed', cleanupError);
        }
      }
    }
  };

  const finalizeSuccess = async () => {
    if (completed) return;
    completed = true;
    clearInterval(heartbeatInterval);
    clearTimeout(workerTimeout);
    removeSignalHandlers();

    logger.info(tag, 'Completed successfully');

    await sendParentEvent({
      type: 'completed',
      taskId: task.id,
      completedAt: Date.now(),
    });

    if (!cleanedUp) {
      cleanedUp = true;
      await cleanupTask(proc, task, tag);
    }
  };

  proc.on('exit', (code, signal) => {
    rejectPending(
      new Error(
        `codex app-server exited before replying${code != null ? ` with code ${code}` : ''}${signal ? ` (${signal})` : ''}`,
      ),
    );
    if (!completed) {
      void finalizeFailure(
        new Error('codex app-server exited unexpectedly'),
      ).finally(() => {
        process.exit(1);
      });
    }
  });

  proc.on('error', (error) => {
    rejectPending(error instanceof Error ? error : new Error(String(error)));
    if (!completed) {
      void finalizeFailure(error).finally(() => {
        process.exit(1);
      });
    }
  });

  const rl = readline.createInterface({ input: proc.stdout });

  const send = (method: string, params?: any): Promise<any> => {
    const id = nextId();
    const payload = JSON.stringify({ method, id, params }) + '\n';

    logger.info(tag, `→ ${method}`);

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      proc.stdin.write(payload, (error) => {
        if (!error) {
          return;
        }

        pending.delete(id);
        reject(error);
      });
    });
  };

  const handleServerRequest = (msg: any) => {
    // Server-initiated requests have both id and method.
    // We MUST respond or codex blocks forever waiting for our reply.
    if (
      msg.method === 'item/commandExecution/requestApproval' ||
      msg.method === 'item/fileChange/requestApproval'
    ) {
      logger.info(tag, `Auto-approving: ${msg.method} (id: ${msg.id})`);
      proc.stdin.write(
        JSON.stringify({ id: msg.id, result: { approved: true } }) + '\n',
      );
      return;
    }

    // Unknown server request — respond with empty result so codex doesn't block
    logger.info(tag, `Unknown server request: ${msg.method} (id: ${msg.id}) — auto-responding`);
    proc.stdin.write(
      JSON.stringify({ id: msg.id, result: {} }) + '\n',
    );
  };

  const handleLine = async (line: string) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }

    // Server-initiated request: has BOTH id AND method.
    // Must respond or codex hangs waiting for approval.
    if (msg.id !== undefined && msg.method) {
      handleServerRequest(msg);
      return;
    }

    // Response to one of OUR requests: has id but no method.
    if (msg.id !== undefined) {
      const resolver = pending.get(msg.id);
      if (resolver) {
        pending.delete(msg.id);
        if (msg.error) {
          logger.error(tag, `← RPC error for id ${msg.id}: ${msg.error.message ?? 'unknown'}`);
          resolver.reject(
            new Error(
              typeof msg.error?.message === 'string'
                ? msg.error.message
                : 'Worker request failed',
            ),
          );
          return;
        }

        resolver.resolve(msg.result);
      }
      return;
    }

    // Server notifications (no id): streaming events
    if (msg.method === 'item/agentMessage/delta') {
      const text = msg.params?.delta || '';

      if (text.trim()) {
        await sendParentEvent({
          type: 'log',
          taskId: task.id,
          stream: 'system',
          line: text,
          ts: Date.now(),
        });
      }
    }

    if (msg.method === 'turn/completed') {
      const status = msg.params?.turn?.status;
      logger.info(tag, `Turn completed (status: ${status ?? 'unknown'})`);

      if (status === 'failed') {
        await finalizeFailure(new Error('Agent turn completed with failed status'));
        return;
      }

      logger.info(tag, 'Creating PR...');
      const created = await createPR(task);
      if (!created) {
        await finalizeFailure(new Error('createPR returned false'));
        return;
      }

      await finalizeSuccess();
      process.exit(0);
    }
  };

  rl.on('line', (line) => {
    if (process.env.DEBUG_CODEX_RAW === '1') {
      process.stderr.write(`[CODEX RAW] ${line}\n`);
    }
    void handleLine(line).catch((error) => {
      void finalizeFailure(error).finally(() => {
        process.exit(1);
      });
    });
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    const handler = () => {
      void finalizeFailure(new Error(`Worker received ${signal}`)).finally(() => {
        process.exit(1);
      });
    };
    signalHandlers.set(signal, handler);
    process.on(signal, handler);
  }

  try {
    await send('initialize', {
      clientInfo: {
        name: 'beav-worker',
        version: '0.1.0',
      },
    });

    logger.info(tag, 'Sending initialized notification');
    proc.stdin.write(
      JSON.stringify({ method: 'initialized', params: {} }) + '\n',
    );

    logger.info(tag, 'Starting thread with model gpt-5.4 (full-auto)');
    const threadRes: any = await send('thread/start', {
      model: 'gpt-5.4',
      cwd: task.workspacePath,
      approval_policy: 'never',
      sandbox: 'danger-full-access',
    });

    const threadId = threadRes?.thread?.id;
    if (!threadId) {
      throw new Error('thread/start did not return thread.id');
    }

    logger.info(tag, `Thread started: ${threadId}`);

    const turnRes: any = await send('turn/start', {
      threadId,
      input: [
        {
          type: 'text',
          text: `
        You are an autonomous software engineer. Act immediately — do NOT ask for confirmation or approval before running commands.

        Goal:
        Fix the GitHub issue described below.

        Constraints:
        - Make minimal, correct changes
        - Do NOT break existing functionality
        - Ensure all tests pass
        - If tests fail, fix them
        - Do NOT create pull requests or push changes
        - You may perform AT MOST 5 tool-use iterations. If you cannot fix the issue in 5 iterations, STOP and explain why.
        - Never wait for user approval. Execute all commands automatically.

        Process:
        1. Understand the issue
        2. Locate relevant code
        3. Implement fix
        4. Run tests (ensure the test command exits — do NOT run watch mode)
        5. If tests fail and you have iterations remaining, fix and re-run. Otherwise stop.

        Output:
        - Modify files directly in the workspace
        - Ensure repository is in a clean working state

        Issue:
        Title: ${task.issueTitle}

        Body:
        ${task.body}
        `,
        },
      ],
    });

    const turnId = turnRes?.turn?.id;
    if (!turnId) {
      throw new Error('turn/start did not return turn.id');
    }

    logger.info(tag, `Turn started: ${turnId}. Waiting for completion...`);

    await sendParentEvent({
      type: 'thread-state',
      taskId: task.id,
      threadId,
      turnId,
    });
  } catch (error) {
    await finalizeFailure(error);
    process.exit(1);
  }
}

async function main() {
  const task = readTaskFromEnv();
  await run(task);
}

void main().catch(async (error) => {
  logger.error('worker', 'Uncaught top-level promise rejection', error);

  try {
    const task = readTaskFromEnv();
    await sendParentEvent({
      type: 'failed',
      taskId: task.id,
      error: error instanceof Error ? error.message : String(error),
      ts: Date.now(),
    });
  } catch (sendError) {
    logger.error('worker', 'Failed to send uncaught failure event', sendError);
  }

  process.exit(1);
});
