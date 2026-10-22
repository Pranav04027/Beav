import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { AssignedTaskSchema } from '@beav/core/worker-events';
import { fileURLToPath } from 'node:url';
import type { Task, TaskStore } from '@beav/core';
import * as logger from '@beav/core/logger';
import { removeWorkspace } from '@beav/core/workspace';
import { createWorkerReports } from './worker-events.js';
import { recordExecutionFailure } from './retries.js';

type ActiveWorker = { process: ChildProcess; closed: Promise<void> };

function signalWorker(pid: number, signal: NodeJS.Signals) {
  try {
    // Workers lead a process group on POSIX, including Codex and git/gh children.
    process.kill(process.platform === 'win32' ? pid : -pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
}

export function createWorkerManager(store: TaskStore, workspaceRoot: string) {
  const active = new Map<string, ActiveWorker>();

  async function launch(task: Task) {
    if (active.has(task.id))
      throw new Error('Task already has a live worker: ' + task.id);
    if (!task.workspacePath || task.claimedAt === null)
      throw new Error('Task must be claimed and have a workspace');
    const assignment = AssignedTaskSchema.parse({
      ...task,
      workspaceRoot,
      retryCount: task.retryCount ?? 0,
    });
    const proc = spawn(
      process.execPath,
      [fileURLToPath(import.meta.resolve('@beav/worker'))],
      {
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
        detached: process.platform !== 'win32',
        env: { ...process.env, BEAV_WORKER_TASK: JSON.stringify(assignment) },
      },
    );
    // No await before this write: incoming IPC cannot race markRunning.
    let running: Task | undefined;
    let launchError: unknown;
    try {
      running = proc.pid ? store.markRunning(task, proc.pid) : undefined;
    } catch (error) {
      launchError = error;
    }
    const owner = running ?? task;
    const reports = createWorkerReports(owner, store);
    let started = false;
    let cleanupDeadline: NodeJS.Timeout | undefined;

    proc.on('message', (message) => {
      void reports
        .handle(message)
        .then((accepted) => {
          const event = message as { type?: string };
          if (
            (event.type === 'completed' || event.type === 'failed') &&
            proc.connected
          ) {
            cleanupDeadline ??= setTimeout(() => {
              try {
                if (proc.pid) signalWorker(proc.pid, 'SIGKILL');
              } catch (error) {
                logger.error(
                  'worker',
                  'Could not stop worker after terminal report',
                  error,
                );
              }
            }, 5000);
            proc.send(
              { type: 'ack', taskId: task.id, event: event.type, accepted },
              (error) => {
                if (error)
                  logger.warn(
                    'ipc',
                    'Could not acknowledge final report: ' + error.message,
                  );
              },
            );
          }
        })
        .catch((error) => logger.error('ipc', 'Worker report failed', error));
    });
    proc.on('error', (error) =>
      logger.error('worker', 'Process error for ' + task.id, error),
    );

    const closed = new Promise<void>((resolve) => {
      proc.once('close', () => {
        if (cleanupDeadline) clearTimeout(cleanupDeadline);
        void (async () => {
          await reports.drain();
          if (proc.pid) signalWorker(proc.pid, 'SIGKILL');
          recordExecutionFailure(
            store,
            started ? owner : task,
            started ? 'crash' : 'launch',
            'Worker exited without an accepted result',
          );
          const current = store.get(task.id);
          if (current && current.claimedAt === task.claimedAt) {
            await removeWorkspace(task.id, workspaceRoot);
            store.clearWorkspace(current);
          }
        })()
          .catch((error) =>
            logger.error('worker', 'Exit recovery failed', error),
          )
          .finally(() => {
            active.delete(task.id);
            resolve();
          });
      });
    });
    active.set(task.id, { process: proc, closed });

    if (!running) {
      if (proc.pid) signalWorker(proc.pid, 'SIGKILL');
      await closed;
      throw (
        launchError ??
        new Error('Worker failed to launch or task claim was lost')
      );
    }
    try {
      await new Promise<void>((resolve, reject) =>
        proc.send({ type: 'start', taskId: task.id }, (error) => {
          if (error) reject(error);
          else resolve();
        }),
      );
      started = true;
    } catch (error) {
      if (proc.pid) signalWorker(proc.pid, 'SIGKILL');
      await closed;
      throw error;
    }
    logger.info('worker', 'Launched ' + task.id + ' as PID ' + proc.pid);
    return proc.pid!;
  }

  async function stop(
    task: Pick<Task, 'id' | 'workerPid'> &
      Partial<Pick<Task, 'claimedAt' | 'retryCount'>>,
  ) {
    const worker = active.get(task.id);
    if (worker) {
      if (worker.process.pid) signalWorker(worker.process.pid, 'SIGTERM');
      const timer = setTimeout(() => {
        if (worker.process.pid) signalWorker(worker.process.pid, 'SIGKILL');
      }, 5000);
      try {
        await worker.closed;
      } finally {
        clearTimeout(timer);
      }
      return;
    }
    // Startup recovery must not kill an unrelated process that reused a saved PID.
    if (!task.workerPid) return;
    try {
      process.kill(task.workerPid, 0);
      if (process.platform !== 'linux') {
        throw new Error(
          'Cannot verify a surviving worker on this platform; stop it before restarting Beav',
        );
      }
      const [command, environment] = await Promise.all([
        readFile('/proc/' + task.workerPid + '/cmdline', 'utf8'),
        readFile('/proc/' + task.workerPid + '/environ', 'utf8'),
      ]);
      if (
        !command
          .split('\0')
          .includes(fileURLToPath(import.meta.resolve('@beav/worker')))
      )
        return;
      const raw = environment
        .split('\0')
        .find((value) => value.startsWith('BEAV_WORKER_TASK='));
      const assigned = AssignedTaskSchema.safeParse(
        JSON.parse(raw?.slice('BEAV_WORKER_TASK='.length) ?? 'null'),
      );
      if (
        assigned.success &&
        assigned.data.id === task.id &&
        assigned.data.claimedAt === task.claimedAt &&
        assigned.data.retryCount === (task.retryCount ?? 0)
      ) {
        signalWorker(task.workerPid, 'SIGKILL');
      }
    } catch (error) {
      if (
        ['ESRCH', 'ENOENT'].includes(
          (error as NodeJS.ErrnoException).code ?? '',
        )
      )
        return;
      throw error;
    }
  }

  return {
    launch,
    stop,
    wait: async (id: string) => {
      await active.get(id)?.closed;
    },
    has: (id: string) => active.has(id),
    async stopAll() {
      await Promise.all(
        [...active].map(([id, worker]) =>
          stop({ id, workerPid: worker.process.pid ?? null }),
        ),
      );
    },
  };
}
export type WorkerManager = ReturnType<typeof createWorkerManager>;
