export * from "./launcher.js";
export * from "./retries.js";
export * from "./tick.js";

import { stopActiveWorkers } from "./launcher.js";
import { recoverOnStartup, tick } from "./tick.js";
import { logger } from "@beav/core";
import type { Workflow } from "@beav/core";

export async function start(workflow?: Workflow) {
    const { loadConfig } = await import("@beav/core");
    const activeWorkflow = workflow ?? loadConfig();

    logger.info('orchestrator', `Starting with repo ${activeWorkflow.repoOwner}/${activeWorkflow.repoName}`);
    logger.info('orchestrator', `Poll interval: ${activeWorkflow.pollIntervalMs}ms, Max concurrent: ${activeWorkflow.maxConcurrent}`);

    let tickInProgress = false;
    let shuttingDown = false;
    let timer: NodeJS.Timeout | null = null;

    const shutdown = async (reason: string, exitCode = 0) => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      logger.info('orchestrator', `Shutting down: ${reason}`);
      await stopActiveWorkers();
      logger.info('orchestrator', 'All workers stopped');
      process.exitCode = exitCode;
    };

    const runTick = async (failHard = false) => {
      if (tickInProgress || shuttingDown) {
        if (tickInProgress) {
          logger.info('orchestrator', 'Skipping tick: previous run still active');
        }
        return;
      }

      tickInProgress = true;
      try {
        await tick(activeWorkflow);
      } catch (error) {
        logger.error('orchestrator', 'Fatal tick failure', error);
        await shutdown('Stopping after fatal tick failure.', 1);
        if (failHard) {
          throw error;
        }
      } finally {
        tickInProgress = false;
      }
    };

    const handleSignal = (signal: NodeJS.Signals) => {
      void shutdown(`Received ${signal}. Stopping active workers.`).finally(() => {
        process.exit();
      });
    };

    process.once('SIGINT', handleSignal);
    process.once('SIGTERM', handleSignal);

    logger.info('orchestrator', 'Recovering stale tasks from previous run...');
    await recoverOnStartup();

    logger.info('orchestrator', 'Running first tick...');
    await runTick(true);

    logger.info('orchestrator', `Scheduler active — tick every ${activeWorkflow.pollIntervalMs}ms`);
    timer = setInterval(() => {
      void runTick();
    }, activeWorkflow.pollIntervalMs);
}
