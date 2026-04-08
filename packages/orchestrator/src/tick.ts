import { db, sql, tasks, TaskStateMachine, eq, type Task} from "@beav/core";
import { config , type Workflow} from "@beav/core"
import {fetchIssue} from "@beav/tracker"

async function recoverOnStartup() {
  await db.transaction(async (tx) => {
    const recovered = await tx.select().from(tasks).where(eq(tasks.status, "running"));
    for (const task of recovered) {
      const sm = new TaskStateMachine(task.status);
      const next = sm.transitionTo("crashed")
      await tx.update(tasks).set({ status: next }).where(eq(tasks.id, task.id));
    }
          
    if (recovered.length > 0) {
      console.log(`[Boot] Successfully recovered ${recovered.length} tasks.`);
    }
  })
}

async function checkDeadTasksandUpdate(threshold:number) {
  //check running tasks
  //const threshold = Date.now() - config.thresholdMs;
  await db.transaction(async (tx) => {
    const runningTasks = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.status, "running"));

     for (const task of runningTasks) {
         if (task.lastHeartbeat != null && task.lastHeartbeat < threshold) {
           const sm = new TaskStateMachine(task.status);

           try {
             const next = sm.transitionTo("crashed");
             await tx
               .update(tasks)
               .set({ status: next })
               .where(eq(tasks.id, task.id));
           } catch (e) {
             console.error(`Invalid transition for task ${task.id}`);
           }    
         }
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
      .where(sql`${tasks.status}='pending' OR ${tasks.status} = 'crashed' AND ${tasks.retryCount}<${tasks.maxRetries}`)
      .orderBy(tasks.createdAt)
      .limit(availableSlot)
    
    for (const task of candidates) {
        const sm = new TaskStateMachine(task.status);
        const nextStatus = sm.transitionTo("claimed");
        
        tx.update(tasks).set({ status: nextStatus, claimedAt: Date.now() }).where(eq(tasks.id, task.id))
        
        taskToLaunch.push((task))
    }
  })
    console.log(`[Dispatcher] Successfully claimed ${taskToLaunch.length} tasks. Spawning workers...`);
    
    for (const task of taskToLaunch) {
        launchWorker(task, config).catch((err) => {
        console.error(`[Launcher] Critical failure for task ${task.id}:`, err);
      })
    }
}

async function launchWorker(task:Task, config: Workflow) {
    
}

async function tick(config: Workflow) {
  console.log(`\nTick Start: ${new Date().toLocaleTimeString()}`);
    
    try {
      const threshold = Date.now() - config.thresholdMs;
      await checkDeadTasksandUpdate(threshold);
      
      await fetchCandidateIssue(config);
      
      await dispatchTasks(config);
      
      // 4. (Day 4) The Gatekeeper: Check CI status for 'verifying' tasks
      // await checkVerifyingTasks(workflowConfig);
    } catch (error) {
        console.error("CRITICAL TICK ERROR", error);
    }
    
}
