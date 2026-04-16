console.log('worker');
import { spawn } from 'node:child_process';
import readline from 'node:readline';
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

  const rl = readline.createInterface({ input: proc.stdout });

  const send = (method: string, params?: any): Promise<any> => {
    const id = nextId();

    proc.stdin.write(JSON.stringify({ method, id, params }) + '\n');

    return new Promise((resolve) => {
      pending.set(id, resolve);
    });
  };

  rl.on('line', async (line) => {
    const msg = JSON.parse(line);

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

    if (msg.method === "agentMessage/delta") {
      await db.insert(taskLogs).values({
        taskId: taskIdStr,
        stream: 'system',
        line: JSON.stringify(msg),
        ts: Date.now(),
      });
    }

    // Turn finished
      if (msg.method === 'turn/completed') {
      
      await db
        .update(tasks)
        .set({
          status: 'verifying',
          completedAt: Date.now(),
        })
        .where(eq(tasks.id, taskIdStr));

      process.exit(0);
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
  await send('turn/start', {
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
        5. Clean workspace before retry
           VERY IMPORTANT:
           Before retry:
           - git reset --hard
           - git clean -fd
        6. Iterate until tests pass
        
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
}

run();
