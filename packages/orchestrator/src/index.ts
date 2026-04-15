export * from "./launcher.js";
export * from "./retries.js";
export * from "./tick.js";

import { recoverOnStartup, tick } from "./tick.js";
import type { Workflow } from "@beav/core";

export async function start(workflow?: Workflow) {
    const { loadConfig } = await import("@beav/core");
    const activeWorkflow = workflow ?? loadConfig();

    await recoverOnStartup()
    await tick(activeWorkflow)
    setInterval(() => {
      void tick(activeWorkflow);
    }, activeWorkflow.pollIntervalMs)
}
