import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcess } from "node:child_process";
import { db, eq, type Task, type WorkerEvent } from "@beav/core";
import { tasks } from "@beav/core";
import { handleWorkerMessage } from "./worker-events.js";

const workerEntryPoint = fileURLToPath(
  new URL("../../worker/dist/index.js", import.meta.url),
);
const activeWorkers = new Map<string, ChildProcess>();

export async function loadTaskForLaunch(taskId: string): Promise<Task> {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  if (!task.workspacePath) {
    throw new Error(`Task ${taskId} is missing workspacePath`);
  }

  return task;
}

export async function launchTaskProcess(task: Task) {
  const serializedTask = JSON.stringify(task);
  const proc = spawn(
    process.execPath,
    [workerEntryPoint],
    {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: {
        ...process.env,
        BEAV_WORKER_TASK: serializedTask,
      },
      cwd: path.resolve(path.dirname(workerEntryPoint), "../.."),
    },
  );

  let workerMessages = Promise.resolve();
  activeWorkers.set(task.id, proc);

  proc.on("message", (message) => {
    workerMessages = workerMessages
      .then(() => handleWorkerMessage(message as WorkerEvent))
      .catch((error) => {
        console.error(`[Worker ${task.id}] Failed to persist worker event:`, error);
      });
  });

  proc.once("exit", () => {
    activeWorkers.delete(task.id);
  });

  proc.once("error", (error) => {
    activeWorkers.delete(task.id);
    console.error(`[Worker ${task.id}] Process error:`, error);
  });

  await db.update(tasks)
    .set({
      workerPid: proc.pid,
      status: "running",
      startedAt: Date.now(),
    })
    .where(eq(tasks.id, task.id));

  return proc.pid;
}

export async function stopActiveWorkers(signal: NodeJS.Signals = "SIGTERM") {
  const exits = Array.from(activeWorkers.entries()).map(([taskId, proc]) => {
    return new Promise<void>((resolve) => {
      if (proc.exitCode != null || proc.killed) {
        activeWorkers.delete(taskId);
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch (error) {
          console.error(`[Worker ${taskId}] Failed to force kill worker:`, error);
        }
      }, 5000);

      proc.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });

      try {
        proc.kill(signal);
      } catch (error) {
        clearTimeout(timeout);
        console.error(`[Worker ${taskId}] Failed to stop worker:`, error);
        resolve();
      }
    });
  });

  await Promise.all(exits);
}
