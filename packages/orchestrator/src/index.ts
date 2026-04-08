export * from "./launcher.js";
export * from "./retries.js";
export * from "./tick.js";
export * from "./workspaces.js";

import { recoverOnStartup, tick } from "./tick.js";
import { config , type Workflow} from "@beav/core"

export async function start() {
    await recoverOnStartup()
    await tick(config)
    setInterval(() => tick(config), config.pollIntervalMs)
}