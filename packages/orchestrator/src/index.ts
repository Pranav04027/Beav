export * from "./launcher.js";
export * from "./retries.js";
export * from "./tick.js";

import { stopActiveWorkers } from "./launcher.js";
import { recoverOnStartup, tick } from "./tick.js";
import type { Workflow } from "@beav/core";

export async function start(workflow?: Workflow) {
    const { loadConfig } = await import("@beav/core");
    const activeWorkflow = workflow ?? loadConfig();
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

      console.log(`[Orchestrator] ${reason}`);
      await stopActiveWorkers();
      process.exitCode = exitCode;
    };

    const runTick = async (failHard = false) => {
      if (tickInProgress || shuttingDown) {
        console.log('[Orchestrator] Skipping tick because the previous run is still active.');
        return;
      }

      tickInProgress = true;
      try {
        await tick(activeWorkflow);
      } catch (error) {
        console.error('[Orchestrator] Fatal tick failure:', error);
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

    await recoverOnStartup()
    await runTick(true)
    timer = setInterval(() => {
      void runTick();
    }, activeWorkflow.pollIntervalMs)
}
