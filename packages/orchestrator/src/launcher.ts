import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Buffer } from 'node:buffer';
import { db, tasks, eq, sql, type Task, type Workflow } from '@beav/core';
import { setupWorkspace } from './workspaces.js';

const workerScriptPath = fileURLToPath(
  new URL('../../worker/agent.sh', import.meta.url),
);

export async function launchTaskProcess(task: Task, config: Workflow) {
  try {
    const workspacePath = await setupWorkspace(
      task.id,
      task.repoOwner,
      task.repoName,
      config.workspaceRoot,
    );

    const dbPath = path.resolve(process.cwd(), 'beav.db');
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      TASK_ID: task.id,
      DB_PATH: dbPath,
      GITHUB_TOKEN: config.ghToken,
      GITHUB_ISSUE_NUMBER: String(task.githubIssueNumber),
    };

    if (task.body !== null) {
      childEnv.ISSUE_BODY = task.body;
    }

    const child = spawn('bash', [workerScriptPath], {
      cwd: workspacePath,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (child.pid) {
      await db
        .update(tasks)
        .set({
          workerPid: child.pid,
          status: 'running',
          startedAt: Date.now(),
          lastHeartbeat: Date.now(),
        })
        .where(eq(tasks.id, task.id));

      console.log(`[Launcher] Task ${task.id} is live (PID: ${child.pid})`);
    }

    // 4. LOG PIPING (Phase 6 teaser)
    child.stdout.on('data', (data: Buffer) => {
      console.log(`[Worker ${task.id}]: ${data.toString().trim()}`);
      // Future: db.insert(taskLogs)...
    });

    child.stderr.on('data', (data: Buffer) => {
      console.error(`[Worker ${task.id} ERROR]: ${data.toString().trim()}`);
    });

    // 5. EXIT HANDLER: The State Machine move
    child.on('close', async (code: number | null) => {
      const finalStatus = code === 0 ? 'verifying' : 'crashed';

      const updateData: any = {
        status: finalStatus,
        completedAt: Date.now(),
        workerPid: null, // Clear the PID as the process is gone
      };

      if (code !== 0) {
        updateData.retryCount = sql`${tasks.retryCount} + 1`;
        console.error(`[Launcher] Task ${task.id} failed with code ${code}`);
      }

      await db.update(tasks).set(updateData).where(eq(tasks.id, task.id));
    });
  } catch (error) {
    console.error(`[Launcher] Critical failure launching ${task.id}:`, error);
    await db
      .update(tasks)
      .set({
        status: 'crashed',
        retryCount: sql`${tasks.retryCount} + 1`,
        workerPid: null,
      })
      .where(eq(tasks.id, task.id));
  }
}
