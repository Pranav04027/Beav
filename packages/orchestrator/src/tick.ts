import type { Config, TaskStore } from '@beav/core';
import { prepareWorkspace, removeWorkspace } from '@beav/core/workspace';
import * as logger from '@beav/core/logger';
import type { GitHubClient } from '@beav/tracker';
import type { WorkerManager } from './launcher.js';
import { recordExecutionFailure } from './retries.js';

export interface Scheduler {
  config: Config;
  store: TaskStore;
  github: GitHubClient;
  workers: WorkerManager;
}

export async function recoverExecutions(
  context: Scheduler,
  startup = false,
  now = Date.now(),
) {
  const { config, store, workers } = context;
  for (const task of store.list(['claimed', 'running'])) {
    const lastSeen =
      task.lastHeartbeat ??
      task.startedAt ??
      task.claimedAt ??
      task.createdAt ??
      0;
    if (!startup && lastSeen >= now - config.thresholdMs) continue;
    await workers.stop(task);
    recordExecutionFailure(
      store,
      task,
      'crash',
      startup ? 'Parent restarted' : 'Heartbeat expired',
      now,
    );
  }
  for (const task of store.retryable(now)) {
    if (workers.has(task.id)) continue;
    await removeWorkspace(task.id, config.workspaceRoot);
    store.requeue(task);
  }
}

async function discoverIssues({ github, store }: Scheduler) {
  try {
    const added = store.saveIssues(await github.fetchIssues());
    if (added) logger.info('github', 'Queued ' + added + ' new issue(s)');
  } catch (error) {
    logger.error(
      'github',
      'Issue discovery failed; continuing existing work',
      error,
    );
  }
}

export async function launchPendingTasks(
  { config, store, workers }: Scheduler,
  signal?: AbortSignal,
) {
  const capacity = Math.max(0, config.maxConcurrent - store.activeCount());
  const claimed = store.pending(capacity).flatMap((task) => {
    const owned = store.claimPendingTask(task.id);
    return owned ? [owned] : [];
  });
  // Workspace preparation and workers for independent tasks may run concurrently.
  await Promise.all(
    claimed.map(async (task) => {
      try {
        signal?.throwIfAborted();
        const directory = await prepareWorkspace(
          task.id,
          task.repoOwner,
          task.repoName,
          config.workspaceRoot,
          signal,
        );
        signal?.throwIfAborted();
        const prepared = store.setWorkspace(task, directory);
        if (!prepared) throw new Error('Task claim lost before launch');
        await workers.launch(prepared);
      } catch (error) {
        recordExecutionFailure(
          store,
          task,
          'launch',
          error instanceof Error ? error.message : String(error),
        );
        await removeWorkspace(task.id, config.workspaceRoot);
      }
    }),
  );
}

export async function monitorPullRequests({ store, github }: Scheduler) {
  const verifying = store.list(['verifying']);
  // Preserve the existing limit of five simultaneous GitHub verification calls.
  for (let index = 0; index < verifying.length; index += 5) {
    await Promise.all(
      verifying.slice(index, index + 5).map(async (task) => {
        try {
          const state = await github.checkPullRequest(task);
          if (state === 'merged') store.recordCompletion(task);
          else if (state === 'closed' || state === 'failed')
            store.recordVerificationFailure(task);
          logger.info('verify', task.id + ': ' + state);
        } catch (error) {
          logger.error(
            'verify',
            'GitHub check failed; retaining task state',
            error,
          );
        }
      }),
    );
  }
}

export async function tick(context: Scheduler, signal?: AbortSignal) {
  await discoverIssues(context);
  await recoverExecutions(context);
  signal?.throwIfAborted();
  await launchPendingTasks(context, signal);
  await monitorPullRequests(context);
}
