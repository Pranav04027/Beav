import { spawn } from "node:child_process";
import { db, eq, type Task, type WorkerEvent } from "@beav/core";
import { tasks } from "@beav/core";
import { handleWorkerMessage } from "./worker-events.js";

export async function launchTaskProcess(task: Task) {
  const serializedTask = JSON.stringify(task);
  const proc = spawn(
    process.execPath,
    ["packages/worker/dist/index.js"],
    {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: {
        ...process.env,
        BEAV_WORKER_TASK: serializedTask,
      },
    },
  );

  let workerMessages = Promise.resolve();

  proc.on("message", (message) => {
    workerMessages = workerMessages
      .then(() => handleWorkerMessage(message as WorkerEvent))
      .catch((error) => {
        console.error(`[Worker ${task.id}] Failed to persist worker event:`, error);
      });
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
