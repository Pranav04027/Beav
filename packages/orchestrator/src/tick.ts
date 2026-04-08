import { db, sql, tasks, TaskStateMachine, eq, and, lt, inArray, type Task } from "@beav/core";
import { config , type Workflow} from "@beav/core"
import { fetchIssue } from "@beav/tracker"
import { computeRetryDelayMs } from "./retries.js"
import { setupWorkspace } from "./workspaces.js"
import { launchTaskProcess } from "./launcher.js";

export async function recoverOnStartup() {
  await db.transaction(async (tx) => {
    const recovered = await tx.select().from(tasks).where(eq(tasks.status, "running"));
    for (const task of recovered) {
      const sm = new TaskStateMachine(task.status);
      const next = sm.transitionTo("crashed");
      const retryCount = (task.retryCount ?? 0) + 1;
      const maxRetries = task.maxRetries ?? 0;
      const nextRetryAt = retryCount >= maxRetries ? null : Date.now() + computeRetryDelayMs(retryCount);

      await tx
        .update(tasks)
        .set({
          status: next,
          retryCount,
          nextRetryAt,
        })
        .where(eq(tasks.id, task.id));
    }
          
    if (recovered.length > 0) {
      console.log(`[Boot] Successfully recovered ${recovered.length} tasks.`);
    }
  });
}

async function checkDeadTasksandUpdate(threshold: number) {
  await db.transaction(async (tx) => {
    const runningTasks = await tx
      .select()
      .from(tasks)
      .where(eq(tasks.status, "running"));

    for (const task of runningTasks) {
      if (task.lastHeartbeat != null && task.lastHeartbeat < threshold) {
        const sm = new TaskStateMachine(task.status);
        const retryCount = (task.retryCount ?? 0) + 1;
        const maxRetries = task.maxRetries ?? 0;

        if (retryCount >= maxRetries) {
          try {
            const next = sm.transitionTo("failed");
            await tx
              .update(tasks)
              .set({
                status: next,
                retryCount,
                nextRetryAt: null,
              })
              .where(eq(tasks.id, task.id));
          } catch {
            console.error(`A task reached max retries and failed: ${task.id}`);
          }
        } else {
          try {
            const next = sm.transitionTo("crashed");
            await tx
              .update(tasks)
              .set({
                status: next,
                retryCount,
                nextRetryAt: Date.now() + computeRetryDelayMs(retryCount),
              })
              .where(eq(tasks.id, task.id));
          } catch {
            console.error(`Invalid transition for task ${task.id}`);
          }
        }
      }
    }
  });
}

async function requeueRetryableTasks(now: number) {
  await db.transaction(async (tx) => {
    const retryableTasks = await tx
      .select()
      .from(tasks)
      .where(
        and(
          inArray(tasks.status, ["crashed", "failed"]),
          lt(tasks.nextRetryAt, now),
          sql`${tasks.retryCount} < ${tasks.maxRetries}`
        )
      );

    for (const task of retryableTasks) {
      try {
        const sm = new TaskStateMachine(task.status);
        const next = sm.transitionTo("pending");
        await tx
          .update(tasks)
          .set({
            status: next,
            nextRetryAt: null,
            claimedAt: null,
            startedAt: null,
            workerPid: null,
            lastHeartbeat: null,
          })
          .where(eq(tasks.id, task.id));
      } catch {
        console.error(`Failed to requeue task ${task.id}`);
      }
    }

    if (retryableTasks.length > 0) {
      console.log(`[Retry] Requeued ${retryableTasks.length} tasks back to pending.`);
    }
  });
}

async function fetchCandidateIssue(config: Workflow) {
    const owner: string = config.repoOwner;
    const repo: string = config.repoName;
    const ghToken: string = config.ghToken;
    const label:string = "autofix"
    const fetchIssueResponse = await fetchIssue(owner, repo, label, ghToken)
    
    if (fetchIssueResponse.added > 0) {
       console.log(`[Tracker] Sync Successful: ${fetchIssueResponse.added} new tasks added to queue.`)
    }
    if (fetchIssueResponse.errors.length > 0) {
      console.warn(`[Tracker] Sync completed with ${fetchIssueResponse.errors.length} issues skipped.`);
    }
    fetchIssueResponse.errors.forEach((err: any, index: number) => {
      const detail = err.type === "VALIDATION_ERROR" ? `Validation failed for #${err.issueNumber}`: `Database error: ${err.message || "Unknown SQL error"}`;
      console.error(`  -> Error [${index + 1}]: ${detail}`);
    });
    return fetchIssueResponse;
}

async function dispatchTasks(config: Workflow) {
  const activeCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(sql`${tasks.status} IN ('running', 'claimed', 'verifying')`
  );
  
  const availableSlot = config.maxConcurrent - (activeCount[0]?.count ?? 0);
  
  if (availableSlot <= 0) {
    console.log("[Dispatcher] Max concurrency reached. Skipping dispatch.");
    return;
  }
  
  const taskToLaunch: Task[] = [];
    
  await db.transaction(async (tx) => {
    const candidates = await tx
      .select()
      .from(tasks)
      .where(eq(tasks.status, "pending"))
      .orderBy(tasks.createdAt)
      .limit(availableSlot);
    
    for (const task of candidates) {
      const sm = new TaskStateMachine(task.status);
      const nextStatus = sm.transitionTo("claimed");

      const updatedTask = await tx
        .update(tasks)
        .set({ status: nextStatus, claimedAt: Date.now() })
        .where(and(eq(tasks.id, task.id), eq(tasks.status, "pending")))
        .returning();

      const claimedTask = updatedTask[0];

      if (!claimedTask) {
        continue;
      }

      taskToLaunch.push(claimedTask);
    }
  });

  console.log(`[Dispatcher] Successfully claimed ${taskToLaunch.length} tasks. Spawning workers...`);
  
    for (const task of taskToLaunch) {
        
    launchWorker(task, config).catch((err) => {
      console.error(`[Launcher] Critical failure for task ${task.id}:`, err);
    });
  }
}

async function launchWorker(task: Task, config: Workflow) {
    await launchTaskProcess(task, config);
}

export async function tick(config: Workflow) {
  console.log(`\nTick Start: ${new Date().toLocaleTimeString()}`);
    
    try {
      const now = Date.now();
      const threshold = now - config.thresholdMs;
      await checkDeadTasksandUpdate(threshold);
      await requeueRetryableTasks(now);
      
      await fetchCandidateIssue(config);
      
      await dispatchTasks(config);
      
      // 4. (Day 4) The Gatekeeper: Check CI status for 'verifying' tasks
      // await checkVerifyingTasks(workflowConfig);
    } catch (error) {
        console.error("CRITICAL TICK ERROR", error);
    }
    
}
