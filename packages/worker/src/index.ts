console.log('worker');
import { spawn, type ChildProcessByStdio } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs/promises';
import type { Readable, Writable } from 'node:stream';
import { db, eq, tasks, taskLogs, type Task } from '@beav/core';
import { createPR } from './gitcommands.js';

const taskId = process.argv[2];

let rpcId = 0;
const nextId = (): number => ++rpcId;

const pending = new Map<number, (res: any) => void>();

async function markTaskFailed(taskIdStr: string) {
  await db
    .update(tasks)
    .set({
      status: 'failed',
      workspacePath: null,
      threadId: null,
      turnId: null,
    })
    .where(eq(tasks.id, taskIdStr));
}

type WorkerProc = ChildProcessByStdio<Writable, Readable, null>;

async function cleanupTask(proc: WorkerProc, task: Task) {
  if (task.workspacePath) {
    await fs.rm(task.workspacePath, { recursive: true, force: true });
  }

  try {
    proc.kill('SIGKILL');
  } catch (error) {
    console.error('Failed to kill worker child process:', error);
  }
}

async function run(taskIdStr: string) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskIdStr),
  });

  if (!task) {
    throw new Error(`Task not found: ${taskIdStr}`);
  }

  if (!task.workspacePath) {
    throw new Error(`Task ${taskIdStr} is missing workspacePath`);
  }

  const proc: WorkerProc = spawn('codex', ['app-server'], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  const heartbeatInterval = setInterval(() => {
    void db
      .update(tasks)
      .set({ lastHeartbeat: Date.now() })
      .where(eq(tasks.id, taskIdStr))
      .catch((error) => {
        console.error('Heartbeat update failed:', error);
      });
  }, 15 * 1000);

  let completed = false;
  let cleanedUp = false;

  const finalizeFailure = async (error: unknown) => {
    if (completed) return;
    completed = true;
    clearInterval(heartbeatInterval);

    console.error('Worker failed:', error);

    try {
      await db.insert(taskLogs).values({
        taskId: taskIdStr,
        stream: 'system',
        line: `worker error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ts: Date.now(),
      });
    } catch (logError) {
      console.error('Failed to persist worker error log:', logError);
    }

    try {
      await markTaskFailed(taskIdStr);
    } finally {
      if (!cleanedUp) {
        cleanedUp = true;
        try {
          await cleanupTask(proc, task);
        } catch (cleanupError) {
          console.error('Cleanup after failure failed:', cleanupError);
        }
      }
    }
  };

  const finalizeSuccess = async () => {
    if (completed) return;
    completed = true;
    clearInterval(heartbeatInterval);

    await db
      .update(tasks)
      .set({
        status: 'verifying',
        completedAt: Date.now(),
        workspacePath: null,
        threadId: null,
        turnId: null,
      })
      .where(eq(tasks.id, taskIdStr));

    if (!cleanedUp) {
      cleanedUp = true;
      await cleanupTask(proc, task);
    }
  };

  proc.on('exit', () => {
    if (!completed) {
      void finalizeFailure(
        new Error('codex app-server exited unexpectedly'),
      ).finally(() => {
        process.exit(1);
      });
    }
  });

  const rl = readline.createInterface({ input: proc.stdout });

  const send = (method: string, params?: any): Promise<any> => {
    const id = nextId();

    proc.stdin.write(JSON.stringify({ method, id, params }) + '\n');

    return new Promise((resolve) => {
      pending.set(id, resolve);
    });
  };

  const handleLine = async (line: string) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }

    if (msg.id !== undefined) {
      const resolve = pending.get(msg.id);
      if (resolve) {
        resolve(msg.result);
        pending.delete(msg.id);
      }
      return;
    }

    if (msg.method === 'agentMessage/delta') {
      const text = msg.params?.delta || '';

      if (text.trim()) {
        await db.insert(taskLogs).values({
          taskId: taskIdStr,
          stream: 'system',
          line: text,
          ts: Date.now(),
        });
      }
    }

    if (msg.method === 'turn/completed') {
      const status = msg.params?.turn?.status;

      if (status === 'failed') {
        await finalizeFailure(new Error('Agent turn completed with failed status'));
        return;
      }

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
    void handleLine(line).catch((error) => {
      void finalizeFailure(error).finally(() => {
        process.exit(1);
      });
    });
  });

  try {
    await send('initialize', {
      clientInfo: {
        name: 'beav-worker',
        version: '0.1.0',
      },
    });

    proc.stdin.write(
      JSON.stringify({ method: 'initialized', params: {} }) + '\n',
    );

    const threadRes: any = await send('thread/start', {
      model: 'gpt-5.4',
      cwd: task.workspacePath,
    });

    const threadId = threadRes?.thread?.id;
    if (!threadId) {
      throw new Error('thread/start did not return thread.id');
    }

    const turnRes: any = await send('turn/start', {
      threadId,
      input: [
        {
          type: 'text',
          text: `
        You are an autonomous software engineer.

        Goal:
        Fix the GitHub issue described below.

        Constraints:
        - Make minimal, correct changes
        - Do NOT break existing functionality
        - Ensure all tests pass
        - If tests fail, fix them
        - Do NOT create pull requests or push changes

        Process:
        1. Understand the issue
        2. Locate relevant code
        3. Implement fix
        4. Run tests
        5. Iterate until tests pass

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

    await db
      .update(tasks)
      .set({ threadId, turnId })
      .where(eq(tasks.id, taskIdStr));
  } catch (error) {
    await finalizeFailure(error);
    process.exit(1);
  }
}

async function main() {
  if (!taskId) {
    throw new Error('Task ID not provided');
  }

  await run(taskId);
}

void main().catch(async (error) => {
  console.error('Uncaught top-level promise rejection:', error);

  if (taskId) {
    try {
      await markTaskFailed(taskId);
    } catch (dbError) {
      console.error('Failed to mark task as failed:', dbError);
    }
  }

  process.exit(1);
});
