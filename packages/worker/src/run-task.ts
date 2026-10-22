import type {
  AssignedTask,
  WorkerEvent,
  FailureKind,
} from '@beav/core/worker-events';
import { removeWorkspace, validateWorkspace } from '@beav/core/workspace';
import * as logger from '@beav/core/logger';
import { createAgentClient, type AgentClient } from './agent-client.js';
import { createPR } from './gitcommands.js';

export interface WorkerOptions {
  report: (event: WorkerEvent) => Promise<void>;
  signal?: AbortSignal;
  timeoutMs?: number;
  heartbeatMs?: number;
  agent?: AgentClient;
  publish?: typeof createPR;
  cleanup?: typeof removeWorkspace;
}

export async function runTask(
  task: AssignedTask,
  options: WorkerOptions,
): Promise<boolean> {
  validateWorkspace(task.id, task.workspaceRoot, task.workspacePath);
  const controller = new AbortController();
  const agent = options.agent ?? createAgentClient();
  const publish = options.publish ?? createPR;
  const cleanup = options.cleanup ?? removeWorkspace;
  let kind: FailureKind = 'agent';
  let finalReportStarted = false;
  let reports = Promise.resolve();
  const report = (event: WorkerEvent) => {
    // Progress and the final report use the same ordered outgoing channel.
    reports = reports.then(() => options.report(event));
    return reports;
  };
  const abort = () => {
    kind = 'shutdown';
    controller.abort(options.signal?.reason ?? new Error('Worker stopped'));
  };
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timeout = setTimeout(
    () => {
      kind = 'timeout';
      controller.abort(
        new Error('Worker exceeded its 10 minute execution limit'),
      );
    },
    options.timeoutMs ?? 10 * 60_000,
  );
  const heartbeat = setInterval(() => {
    void report({ type: 'heartbeat', taskId: task.id, ts: Date.now() }).catch(
      (error) => controller.abort(error),
    );
  }, options.heartbeatMs ?? 15_000);

  try {
    controller.signal.throwIfAborted();
    await report({ type: 'heartbeat', taskId: task.id, ts: Date.now() });
    await agent.fixIssue(task, {
      signal: controller.signal,
      onProgress: (line) =>
        report({
          type: 'log',
          taskId: task.id,
          stream: 'system',
          line,
          ts: Date.now(),
        }),
      onThread: (threadId, turnId) =>
        report({ type: 'thread-state', taskId: task.id, threadId, turnId }),
    });
    controller.signal.throwIfAborted();
    kind = 'publication';
    const pr = await publish(task, controller.signal);
    controller.signal.throwIfAborted();
    // From here, shutdown and intentional agent exit cannot send a second result.
    clearInterval(heartbeat);
    clearTimeout(timeout);
    finalReportStarted = true;
    await report({
      type: 'completed',
      taskId: task.id,
      completedAt: Date.now(),
      ...pr,
    });
    return true;
  } catch (error) {
    clearInterval(heartbeat);
    clearTimeout(timeout);
    if (!finalReportStarted) {
      finalReportStarted = true;
      // A progress-send error must not leave a rejected chain hiding the result.
      await reports.catch(() => {});
      try {
        await options.report({
          type: 'failed',
          taskId: task.id,
          kind,
          error: error instanceof Error ? error.message : String(error),
          ts: Date.now(),
        });
      } catch (reportError) {
        logger.error('worker', 'Could not report failure', reportError);
      }
    }
    logger.error('worker', 'Task ' + task.id + ' failed', error);
    return false;
  } finally {
    clearInterval(heartbeat);
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
    // Stop the agent before removing files it might still be using.
    try {
      await agent.close();
    } catch (error) {
      logger.error('worker', 'Agent shutdown failed', error);
    }
    try {
      await cleanup(task.id, task.workspaceRoot);
    } catch (error) {
      logger.error('worker', 'Workspace cleanup failed', error);
    }
  }
}
