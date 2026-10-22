import { openDatabase } from '@beav/core/db';
import { createTaskStore } from '@beav/core/task-store';
import { loadConfig, loadEnvironment } from '@beav/core/config';
import * as logger from '@beav/core/logger';
import type { Config } from '@beav/core';
import { createGitHubClient } from '@beav/tracker';
import { createWorkerManager } from './launcher.js';
import { recoverExecutions, tick } from './tick.js';

export async function start(config?: Config) {
  if (!config) loadEnvironment();
  const settings = config ?? loadConfig();
  const connection = openDatabase(settings.databasePath);
  const store = createTaskStore(connection.database);
  const workers = createWorkerManager(store, settings.workspaceRoot);
  const context = {
    config: settings,
    store,
    workers,
    github: createGitHubClient(settings),
  };
  const controller = new AbortController();
  let activeTick: Promise<void> = Promise.resolve();
  let stopping: Promise<void> | undefined;
  let timer: NodeJS.Timeout | undefined;
  let busy = false;

  const shutdown = () => {
    stopping ??= (async () => {
      controller.abort(new Error('Orchestrator is shutting down'));
      if (timer) clearInterval(timer);
      await activeTick.catch(() => {});
      await workers.stopAll();
      connection.close();
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
    })();
    return stopping;
  };
  const onSignal = () => {
    void shutdown().catch((error) => {
      logger.error('shutdown', 'Shutdown failed', error);
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  const runTick = () => {
    if (busy || controller.signal.aborted) return;
    busy = true;
    activeTick = tick(context, controller.signal)
      .catch((error) => {
        if (!controller.signal.aborted) {
          logger.error('scheduler', 'Tick failed', error);
          process.exitCode = 1;
          // Do not await shutdown from the tick it waits for.
          void shutdown();
        }
      })
      .finally(() => {
        busy = false;
      });
  };

  try {
    logger.info('startup', 'Database: ' + settings.databasePath);
    activeTick = recoverExecutions(context, true);
    await activeTick;
    if (controller.signal.aborted) return { stop: shutdown };
    runTick();
    await activeTick;
    if (!controller.signal.aborted)
      timer = setInterval(runTick, settings.pollIntervalMs);
    return { stop: shutdown };
  } catch (error) {
    await shutdown();
    throw error;
  }
}
