import {
  db,
  sql,
  tasks,
  TaskStateMachine,
  eq,
  and,
  lt,
  inArray,
  setupWorkspace,
  logger,
  type Task,
} from '@beav/core';
import fs from 'node:fs/promises';
import { type Workflow } from '@beav/core';
import { fetchIssue } from '@beav/tracker';
import { computeRetryDelayMs } from './retries.js';
import { launchTaskProcess } from './launcher.js';
import { checkVerifyingTasks } from '@beav/tracker';

export async function recoverOnStartup() {
  const recovered = await db
    .select()
    .from(tasks)
    .where(inArray(tasks.status, ['claimed', 'running']));

  if (recovered.length === 0) {
    logger.info('boot', 'No stale tasks to recover');
    return;
  }

  const workspacesToRemove: string[] = [];

  for (const task of recovered) {
    logger.info('boot', `Recovering stale task ${task.id} (${task.status})`);
    const sm = new TaskStateMachine(task.status);
    const next = sm.transitionTo('crashed');
    const retryCount = (task.retryCount ?? 0) + 1;
    const maxRetries = task.maxRetries ?? 0;
    const nextRetryAt =
      retryCount >= maxRetries
        ? null
        : Date.now() + computeRetryDelayMs(retryCount);

    await db
      .update(tasks)
      .set({
        status: next,
        retryCount,
        nextRetryAt,
        workerPid: null,
        workspacePath: null,
        threadId: null,
        turnId: null,
        startedAt: null,
        claimedAt: null,
        lastHeartbeat: null,
      })
      .where(eq(tasks.id, task.id));

    if (task.workspacePath) {
      workspacesToRemove.push(task.workspacePath);
    }
  }

  logger.info('boot', `Recovered ${recovered.length} stale tasks → crashed`);

  for (const workspacePath of workspacesToRemove) {
    await fs.rm(workspacePath, { recursive: true, force: true });
  }
}

async function killTask(taskId: string, pid: number) {
  try {
    process.kill(pid, 'SIGKILL');
    logger.info('deadlock', `Killed stale process ${pid} for task ${taskId}`);
  } catch (error: any) {
    if (error.code === 'ESRCH') {
      logger.info('deadlock', `Process ${pid} for task ${taskId} already dead`);
    } else {
      logger.error('deadlock', `Failed to kill process ${pid} for task ${taskId}`, error.message);
    }
  }
}

async function checkDeadTasksandUpdate(threshold: number) {
  const runningTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, 'running'));

  if (runningTasks.length === 0) return;

  let staleCount = 0;
  let failedCount = 0;

  for (const task of runningTasks) {
    if (task.lastHeartbeat != null && task.lastHeartbeat < threshold) {
      const pid = task.workerPid;
      if (pid) {
        await killTask(task.id, pid);
      }

      const sm = new TaskStateMachine(task.status);
      const retryCount = (task.retryCount ?? 0) + 1;
      const maxRetries = task.maxRetries ?? 0;

      if (retryCount >= maxRetries) {
        try {
          const next = sm.transitionTo('failed');
          await db
            .update(tasks)
            .set({
              status: next,
              retryCount,
              nextRetryAt: null,
              workerPid: null,
              workspacePath: null,
              threadId: null,
              turnId: null,
              startedAt: null,
              claimedAt: null,
              lastHeartbeat: null,
            })
            .where(eq(tasks.id, task.id));

          failedCount++;
          logger.error('deadlock', `Task ${task.id} exceeded max retries (${maxRetries}) → failed`);
        } catch {
          logger.error('deadlock', `Failed to mark task ${task.id} as failed`);
        }
      } else {
        try {
          const next = sm.transitionTo('crashed');
          await db
            .update(tasks)
            .set({
              status: next,
              retryCount,
              nextRetryAt: Date.now() + computeRetryDelayMs(retryCount),
              workerPid: null,
              workspacePath: null,
              threadId: null,
              turnId: null,
              startedAt: null,
              claimedAt: null,
              lastHeartbeat: null,
            })
            .where(eq(tasks.id, task.id));

          staleCount++;
          logger.info('deadlock', `Task ${task.id} stale → crashed (retry ${retryCount}/${maxRetries})`);
        } catch {
          logger.error('deadlock', `Invalid transition for task ${task.id}`);
        }
      }
    }
  }

  if (staleCount > 0 || failedCount > 0) {
    logger.info('deadlock', `Deadlock check: ${staleCount} crashed, ${failedCount} failed out of ${runningTasks.length} running`);
  }
}

async function requeueRetryableTasks(now: number) {
  const retryableTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        inArray(tasks.status, ['crashed', 'failed']),
        lt(tasks.nextRetryAt, now),
        sql`${tasks.retryCount} < ${tasks.maxRetries}`,
      ),
    );

  if (retryableTasks.length === 0) return;

  let requeuedCount = 0;
  const workspacesToRemove: string[] = [];

  for (const task of retryableTasks) {
    try {
      const sm = new TaskStateMachine(task.status);
      const next = sm.transitionTo('pending');
      await db
        .update(tasks)
        .set({
          status: next,
          nextRetryAt: null,
          claimedAt: null,
          startedAt: null,
          workerPid: null,
          lastHeartbeat: null,
          workspacePath: null,
          threadId: null,
          turnId: null,
        })
        .where(eq(tasks.id, task.id));

      requeuedCount++;
      logger.info('retry', `Requeued task ${task.id} (${task.status} → pending)`);

      if (task.workspacePath) {
        workspacesToRemove.push(task.workspacePath);
      }
    } catch {
      logger.error('retry', `Failed to requeue task ${task.id}`);
    }
  }

  for (const workspacePath of workspacesToRemove) {
    await fs.rm(workspacePath, { recursive: true, force: true });
  }
}

async function fetchCandidateIssue(config: Workflow) {
  logger.info('tracker', `Fetching issues from ${config.repoOwner}/${config.repoName} with label "${config.issueTitle}"`);

  const fetchIssueResponse = await fetchIssue(
    config.repoOwner,
    config.repoName,
    config.issueTitle,
    config.ghToken,
  );

  if (fetchIssueResponse.added > 0) {
    logger.info('tracker', `Added ${fetchIssueResponse.added} new issue(s) to queue`);
  }

  if (fetchIssueResponse.skipped > 0) {
    logger.warn('tracker', `Skipped ${fetchIssueResponse.skipped} issue(s)`);
  }

  for (const err of fetchIssueResponse.errors) {
    const detail =
      (err as any).type === 'VALIDATION_ERROR'
        ? `Validation failed for issue #${(err as any).issueNumber}`
        : (err as any).type === 'FETCH_ERROR'
          ? `GitHub API error: ${(err as any).message}`
          : `Database error: ${(err as any).message}`;
    logger.error('tracker', detail);
  }

  return fetchIssueResponse;
}

async function dispatchTasks(config: Workflow) {
  const activeCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(sql`${tasks.status} IN ('running', 'claimed', 'verifying')`);

  const active = activeCount[0]?.count ?? 0;
  const availableSlot = config.maxConcurrent - active;

  if (availableSlot <= 0) {
    logger.info('dispatch', `At capacity: ${active}/${config.maxConcurrent} workers active`);
    return;
  }

  const candidates = await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, 'pending'))
    .orderBy(tasks.createdAt)
    .limit(availableSlot);

  if (candidates.length === 0) {
    logger.info('dispatch', 'No pending tasks to dispatch');
    return;
  }

  logger.info('dispatch', `Claiming ${candidates.length} task(s) for dispatch (${active}/${config.maxConcurrent} active)`);

  const taskToLaunch: Task[] = [];

  for (const task of candidates) {
    const sm = new TaskStateMachine(task.status);
    const nextStatus = sm.transitionTo('claimed');

    const updatedTask = await db
      .update(tasks)
      .set({ status: nextStatus, claimedAt: Date.now() })
      .where(and(eq(tasks.id, task.id), eq(tasks.status, 'pending')))
      .returning();

    const claimedTask = updatedTask[0];
    if (!claimedTask) {
      continue;
    }

    taskToLaunch.push(claimedTask);
    logger.info('dispatch', `Claimed task ${task.id} (${task.issueTitle})`);
  }

  for (const task of taskToLaunch) {
    try {
      logger.info('dispatch', `Setting up workspace for task ${task.id}...`);

      const workspacePath = await setupWorkspace(
        task.id,
        task.repoOwner,
        task.repoName,
        config.workspaceRoot,
      );

      await db
        .update(tasks)
        .set({ workspacePath })
        .where(eq(tasks.id, task.id));

      const workerPid = await launchTaskProcess({
        ...task,
        workspacePath,
      });

      logger.info('dispatch', `Launched task ${task.id} → worker PID ${workerPid}`);
    } catch (error) {
      logger.error('dispatch', `Failed to launch task ${task.id}`, error);

      const retryCount = (task.retryCount ?? 0) + 1;
      const maxRetries = task.maxRetries ?? 0;
      const nextStatus = new TaskStateMachine('claimed').transitionTo('crashed');

      await db
        .update(tasks)
        .set({
          status: nextStatus,
          retryCount,
          nextRetryAt:
            retryCount >= maxRetries
              ? null
              : Date.now() + computeRetryDelayMs(retryCount),
          workerPid: null,
          workspacePath: null,
          claimedAt: null,
          startedAt: null,
          lastHeartbeat: null,
        })
        .where(eq(tasks.id, task.id));
    }
  }
}

async function VerifyTasks(config: Workflow) {
  await checkVerifyingTasks(config);
}

export async function tick(config: Workflow) {
  logger.info('tick', '─── Tick started ───');

  const tickStart = Date.now();
  const now = Date.now();
  const threshold = now - config.thresholdMs;

  await checkDeadTasksandUpdate(threshold);
  await requeueRetryableTasks(now);
  await fetchCandidateIssue(config);
  await dispatchTasks(config);
  await VerifyTasks(config);

  const elapsed = Date.now() - tickStart;
  logger.info('tick', `Tick completed in ${elapsed}ms`);
}
