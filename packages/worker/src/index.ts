console.log("worker");
import { spawn } from "node:child_process";
import readline from "node:readline";
import { db } from "@beav/core";
import { tasks, taskLogs } from "@beav/core";
import { eq } from "@beav/core";

const taskId = process.argv[2];

let rpcId = 0;
const nextId = () => ++rpcId;

const pending = new Map<number, (res: any) => void>();

async function run() {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) {
    console.error("Task not found");
    process.exit(1);
  }

  // 🚀 Start Codex
  const proc = spawn("codex", ["app-server"], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  const rl = readline.createInterface({ input: proc.stdout });

  const send = (method: string, params?: any) => {
    const id = nextId();

    proc.stdin.write(
      JSON.stringify({ method, id, params }) + "\n"
    );

    return new Promise((resolve) => {
      pending.set(id, resolve);
    });
  };

  rl.on("line", async (line) => {
    const msg = JSON.parse(line);

    // ✅ Response
    if (msg.id !== undefined) {
      const resolve = pending.get(msg.id);
      if (resolve) {
        resolve(msg.result);
        pending.delete(msg.id);
      }
      return;
    }

    // ✅ Notifications (EVENTS)
    await db.insert(taskLogs).values({
      taskId,
      stream: "system",
      line: JSON.stringify(msg),
      ts: Date.now(),
    });

    // Turn finished
    if (msg.method === "turn/completed") {
      await db
        .update(tasks)
        .set({
          status: "verifying",
          completedAt: Date.now(),
        })
        .where(eq(tasks.id, taskId));

      process.exit(0);
    }
  });

  // 🧠 INIT FLOW
  await send("initialize", {
    clientInfo: {
      name: "beav-worker",
      version: "0.1.0",
    },
  });

  proc.stdin.write(
    JSON.stringify({ method: "initialized", params: {} }) + "\n"
  );

  // 🧵 Create thread
  const threadRes: any = await send("thread/start", {
    model: "gpt-5.4",
    cwd: task.workspacePath,
  });

  const threadId = threadRes.thread.id;

  // 💬 Start turn (THIS replaces your whole agent loop)
  await send("turn/start", {
    threadId,
    input: [
      {
        type: "text",
        text: `
Fix this GitHub issue:

Title: ${task.issueTitle}

Body:
${task.body}

Make code changes, run tests, and create a PR.
        `,
      },
    ],
  });
}

run();