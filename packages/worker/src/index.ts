console.log('worker');
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs/promises';
import { db } from '@beav/core';
import { tasks, taskLogs } from '@beav/core';
import { eq } from '@beav/core';
import { createPR } from './gitcommands.js';

const taskId = process.argv[2];

if (!taskId) {
  console.error('Task ID not provided');
  process.exit(1);
}
const taskIdStr: string = taskId;

let rpcId = 0;
const nextId = (): number => {
  return ++rpcId;
};

const pending = new Map<number, (res: any) => void>();

let completed = false;

async function run() {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskIdStr),
  });

  if (!task) {
    console.error('Task not found');
    process.exit(1);
  }

  //start Codex
  const proc = spawn('codex', ['app-server'], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  setTimeout(
    async () => {
      if (!completed) {
        completed = true;
        await db
          .update(tasks)
          .set({
            status: 'crashed',
            workspacePath: null,
            threadId: null,
            turnId: null,
          })
          .where(eq(tasks.id, taskIdStr));

        if (task.workspacePath) {
          await fs.rm(task.workspacePath, { recursive: true, force: true });
        }

        proc.kill('SIGKILL');

        setTimeout(() => process.exit(1), 50);
      }
    },
    10 * 60 * 1000,
  );

  proc.on('exit', async () => {
    if (!completed) {
      completed = true;

      await db
        .update(tasks)
        .set({
          status: 'crashed',
          workspacePath: null,
          threadId: null,
          turnId: null,
        })
        .where(eq(tasks.id, taskIdStr));

      if (task.workspacePath) {
        await fs.rm(task.workspacePath, { recursive: true, force: true });
      }

      process.exit(1);
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

  rl.on('line', async (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }

    //Response
    if (msg.id !== undefined) {
      const resolve = pending.get(msg.id);
      if (resolve) {
        resolve(msg.result);
        pending.delete(msg.id);
      }
      return;
    }

    //Notifications (EVENTS)

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

    // Turn finished
    if (msg.method === 'turn/completed') {
      if (completed) return;
      completed = true;
      const status = msg.params?.turn?.status;

      if (status === 'failed') {
        await db
          .update(tasks)
          .set({
            status: 'failed',
            workspacePath: null,
            threadId: null,
            turnId: null,
          })
          .where(eq(tasks.id, taskIdStr));

        if (task.workspacePath) {
          await fs.rm(task.workspacePath, { recursive: true, force: true });
        }

        proc.kill('SIGKILL');
        setTimeout(() => process.exit(1), 50);
      }

      try {
        const created = await createPR(task);
        if (!created) {
          await db
            .update(tasks)
            .set({
              status: 'failed',
              workspacePath: null,
              threadId: null,
              turnId: null,
            })
            .where(eq(tasks.id, taskIdStr));

          if (task.workspacePath) {
            await fs.rm(task.workspacePath, { recursive: true, force: true });
          }

          proc.kill('SIGKILL');
          setTimeout(() => process.exit(1), 50);
        }
      } catch (err) {
        await db
          .update(tasks)
          .set({
            status: 'failed',
            workspacePath: null,
            threadId: null,
            turnId: null,
          })
          .where(eq(tasks.id, taskIdStr));

        if (task.workspacePath) {
          await fs.rm(task.workspacePath, { recursive: true, force: true });
        }

        proc.kill('SIGKILL');
        setTimeout(() => process.exit(1), 50);
      }

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

      if (task.workspacePath) {
        await fs.rm(task.workspacePath, { recursive: true, force: true });
      }

      proc.kill('SIGKILL');
      setTimeout(() => process.exit(1), 50);
    }
  });

  //INIT FLOW
  await send('initialize', {
    clientInfo: {
      name: 'beav-worker',
      version: '0.1.0',
    },
  });

  proc.stdin.write(
    JSON.stringify({ method: 'initialized', params: {} }) + '\n',
  );

  // 🧵 Create thread
  const threadRes: any = await send('thread/start', {
    model: 'gpt-5.4',
    cwd: task.workspacePath,
  });

  const threadId = threadRes.thread.id;

  // 💬 Start turn (THIS replaces your whole agent loop)
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

  await db
    .update(tasks)
    .set({ threadId: threadId, turnId: turnRes.turn.id })
    .where(eq(tasks.id, taskIdStr));
}

run();
