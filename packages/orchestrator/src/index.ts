export * from "./launcher.js";
export * from "./retries.js";
export * from "./tick.js";

import { recoverOnStartup, tick } from "./tick.js";
import type { Workflow } from "@beav/core";

export async function start(workflow?: Workflow) {
    const { loadConfig } = await import("@beav/core");
    const activeWorkflow = workflow ?? loadConfig();
    let tickInProgress = false;

    const runTick = async () => {
      if (tickInProgress) {
        console.log('[Orchestrator] Skipping tick because the previous run is still active.');
        return;
      }

      tickInProgress = true;
      try {
        await tick(activeWorkflow);
      } finally {
        tickInProgress = false;
      }
    };

    await recoverOnStartup()
    await runTick()
    setInterval(() => {
      void runTick();
    }, activeWorkflow.pollIntervalMs)
}
