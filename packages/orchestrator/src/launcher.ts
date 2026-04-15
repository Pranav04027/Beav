import { spawn } from "node:child_process";
import { db } from "@beav/core";
import { tasks } from "@beav/core";
import { eq } from "drizzle-orm";

export async function launchTaskProcess(taskId: string) {
  const proc = spawn(
    "node",
    ["packages/worker/dist/index.js", taskId],
    {
      stdio: "inherit",
    }
  );

  await db
    .update(tasks)
    .set({
      workerPid: proc.pid,
      status: "running",
      startedAt: Date.now(),
    })
    .where(eq(tasks.id, taskId));

  return proc.pid;
}