import { 
  db, tasks, eq, and, lt, asc, inArray, sql, 
  config, type TaskStatus 
} from "@beav/core";
import { manageWorkspace } from "./workspace";

export async function runTick() {
  console.log(`[${new Date().toISOString()}] --- Tick Start ---`);

  try {
    // 1. Clean up "Stalled" workers
    await reconcileStalledTasks();

    // 2. Check tasks waiting for PR/CI (Skeleton for Day 2)
    await checkVerifyingTasks();

    // 3. Find and start new work
    await dispatchPendingTasks();
    
  } catch (error) {
    console.error("CRITICAL: Tick execution failed:", error);
  }

  console.log(`[${new Date().toISOString()}] --- Tick End ---`);
}