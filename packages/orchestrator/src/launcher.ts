import { spawn } from "node:child_process";
import path from "node:path";
import {
    db,
    sql,
    tasks,
    TaskStateMachine,
    eq,
    and,
    lt,
    inArray,
    type Task,
} from "@beav/core";
import { config, type Workflow } from "@beav/core";
import { setupWorkspace } from "./workspaces.js";

export async function launchTaskProcess(
    task: Task,
    config: Workflow,
): Promise<void> {
    try {
        const taskId = task.id;
        const htmlUrl = task.htmlUrl;
        const workspaceRoot = config.workspaceRoot;

        const safePath = await setupWorkspace(taskId, htmlUrl, workspaceRoot);

        await db
            .update(tasks)
            .set({
                status: "running",
                workspacePath: safePath,
                startedAt: Date.now(),
                lastHeartbeat: Date.now(),
            })
            .where(eq(tasks.id, task.id));

        await db
            .update(tasks)
            .set({
                status: "running",
                workspacePath: safePath,
                startedAt: Date.now(),
                lastHeartbeat: Date.now(),
            })
            .where(eq(tasks.id, task.id));

        const workerScript = path.resolve(process.cwd(), "../worker/agent.sh");

        const child = spawn("bash", [workerScript], {
            cwd: safePath,
            env: {
                ...process.env,
                TASK_ID: task.id,
                REPO_NAME: task.repoName,
                DB_PATH: path.resolve(process.cwd(), "../../maestro.db"),
            },
            detached: false, // Keep it tied to parent for easy cleanup
        });

        // 4. Capture and Save the PID immediately
        if (child.pid) {
            await db
                .update(tasks)
                .set({ workerPid: child.pid })
                .where(eq(tasks.id, task.id));
            console.log(
                `[Launcher] Task ${task.id} started with PID: ${child.pid}`,
            );
        }

        // 5. Exit Handling
        child.on("close", async (code) => {
            const finalStatus = code === 0 ? "verifying" : "crashed";

            const updateData: any = {
                status: finalStatus,
                completedAt: Date.now(),
            };

            if (code !== 0) {
                updateData.retryCount = sql`${tasks.retryCount} + 1`;
                console.error(
                    `[Launcher] Task ${task.id} crashed with code ${code}`,
                );
            } else {
                console.log(
                    `[Launcher] Task ${task.id} finished successfully. Ready for verification.`,
                );
            }

            await db.update(tasks).set(updateData).where(eq(tasks.id, task.id));
        });
    } catch (error) {
        console.error(`[Launcher] Failed to launch task ${task.id}:`, error);
        await db
            .update(tasks)
            .set({
                status: "crashed",
                retryCount: sql`${tasks.retryCount} + 1`,
            })
            .where(eq(tasks.id, task.id));
    }
}
