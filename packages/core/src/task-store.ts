import { randomUUID } from 'node:crypto';
import { and, count, eq, inArray, isNull, lt, lte, or } from 'drizzle-orm';
import { tasks, taskLogs } from './schema.js';
import { assertAllowedTransition, type TaskStatus } from './state-machine.js';
import { TrackedIssueSchema, type Task, type TrackedIssue } from './types.js';
import type { TaskDatabase } from './db.js';

export type Attempt = Pick<Task, 'id' | 'claimedAt' | 'retryCount'>;
export interface FailureRecord {
  status: 'failed' | 'crashed';
  retryCount: number;
  nextRetryAt: number | null;
  error: string;
  ts: number;
}

// A child belongs to one claim, not merely to a task ID. Old reports cannot
// update a later retry of the same task. No schema migration is necessary.
function ownsAttempt(task: Attempt, statuses: TaskStatus[]) {
  return and(
    eq(tasks.id, task.id),
    task.claimedAt === null
      ? isNull(tasks.claimedAt)
      : eq(tasks.claimedAt, task.claimedAt),
    task.retryCount === null
      ? isNull(tasks.retryCount)
      : eq(tasks.retryCount, task.retryCount),
    inArray(tasks.status, statuses),
  );
}

export function createTaskStore(database: TaskDatabase) {
  const get = (id: string) =>
    database.select().from(tasks).where(eq(tasks.id, id)).get();
  const list = (statuses?: TaskStatus[]) => {
    const query = database.select().from(tasks);
    return (statuses ? query.where(inArray(tasks.status, statuses)) : query)
      .orderBy(tasks.createdAt)
      .all();
  };
  const update = (
    task: Attempt,
    statuses: TaskStatus[],
    values: Partial<typeof tasks.$inferInsert>,
  ) =>
    database
      .update(tasks)
      .set(values)
      .where(ownsAttempt(task, statuses))
      .returning()
      .get();

  return {
    get,
    list,
    logs(taskId?: string) {
      const query = database.select().from(taskLogs);
      return (taskId ? query.where(eq(taskLogs.taskId, taskId)) : query)
        .orderBy(taskLogs.id)
        .all();
    },
    saveIssues(issues: TrackedIssue[], now = Date.now()) {
      return database.transaction((tx) => {
        let added = 0;
        for (const issue of issues) {
          const result = tx
            .insert(tasks)
            .values({
              ...TrackedIssueSchema.parse(issue),
              id: randomUUID(),
              createdAt: now,
            })
            .onConflictDoNothing()
            .run();
          added += result.changes;
        }
        return added;
      });
    },
    activeCount() {
      return database
        .select({ count: count() })
        .from(tasks)
        .where(inArray(tasks.status, ['claimed', 'running', 'verifying']))
        .get()!.count;
    },
    pending(limit: number) {
      return database
        .select()
        .from(tasks)
        .where(eq(tasks.status, 'pending'))
        .orderBy(tasks.createdAt)
        .limit(limit)
        .all();
    },
    claimPendingTask(id: string, now = Date.now()) {
      assertAllowedTransition('pending', 'claimed');
      // This conditional UPDATE and returned row determine claim ownership.
      return database
        .update(tasks)
        .set({ status: 'claimed', claimedAt: now })
        .where(and(eq(tasks.id, id), eq(tasks.status, 'pending')))
        .returning()
        .get();
    },
    setWorkspace(task: Attempt, workspacePath: string) {
      return update(task, ['claimed'], { workspacePath });
    },
    markRunning(task: Attempt, workerPid: number, now = Date.now()) {
      assertAllowedTransition('claimed', 'running');
      // Start the lease here, closing the gap before the first heartbeat.
      return update(task, ['claimed'], {
        status: 'running',
        workerPid,
        startedAt: now,
        lastHeartbeat: now,
      });
    },
    recordHeartbeat(task: Attempt, ts: number) {
      return database
        .update(tasks)
        .set({ lastHeartbeat: ts })
        .where(
          and(
            ownsAttempt(task, ['running']),
            or(isNull(tasks.lastHeartbeat), lte(tasks.lastHeartbeat, ts)),
          ),
        )
        .returning()
        .get();
    },
    recordLog(
      task: Attempt,
      line: string,
      ts: number,
      stream: 'stdout' | 'stderr' | 'system' = 'system',
    ) {
      return database.transaction((tx) => {
        if (
          !tx
            .select()
            .from(tasks)
            .where(ownsAttempt(task, ['running']))
            .get()
        )
          return false;
        tx.insert(taskLogs).values({ taskId: task.id, line, ts, stream }).run();
        return true;
      });
    },
    recordThread(task: Attempt, threadId: string, turnId: string) {
      return update(task, ['running'], { threadId, turnId });
    },
    recordFailure(task: Attempt, failure: FailureRecord) {
      return database.transaction(
        (tx) => {
          const current = tx
            .select()
            .from(tasks)
            .where(ownsAttempt(task, ['claimed', 'running']))
            .get();
          if (!current) return undefined;
          assertAllowedTransition(current.status, failure.status);
          const changed = tx
            .update(tasks)
            .set({
              status: failure.status,
              retryCount: failure.retryCount,
              nextRetryAt: failure.nextRetryAt,
              workerPid: null,
              lastHeartbeat: null,
              threadId: null,
              turnId: null,
            })
            .where(ownsAttempt(task, [current.status]))
            .returning()
            .get();
          if (changed)
            tx.insert(taskLogs)
              .values({
                taskId: task.id,
                stream: 'system',
                line: failure.error,
                ts: failure.ts,
              })
              .run();
          // Keep workspacePath until the old execution has stopped and cleanup succeeds.
          return changed;
        },
        { behavior: 'immediate' },
      );
    },
    markVerifying(
      task: Attempt,
      pr: { prNumber: number; prUrl: string },
      completedAt: number,
    ) {
      assertAllowedTransition('running', 'verifying');
      return update(task, ['running'], {
        status: 'verifying',
        prNumber: pr.prNumber,
        prURL: pr.prUrl,
        completedAt,
        workerPid: null,
        lastHeartbeat: null,
        threadId: null,
        turnId: null,
      });
    },
    retryable(now = Date.now()) {
      return database
        .select()
        .from(tasks)
        .where(
          and(
            inArray(tasks.status, ['failed', 'crashed']),
            lte(tasks.nextRetryAt, now),
            lt(tasks.retryCount, tasks.maxRetries),
          ),
        )
        .all();
    },
    requeue(task: Task) {
      assertAllowedTransition(task.status, 'pending');
      return update(task, [task.status], {
        status: 'pending',
        nextRetryAt: null,
        claimedAt: null,
        startedAt: null,
        workerPid: null,
        lastHeartbeat: null,
        workspacePath: null,
        threadId: null,
        turnId: null,
      });
    },
    clearWorkspace(task: Attempt) {
      return update(task, ['verifying', 'failed', 'crashed'], {
        workspacePath: null,
      });
    },
    recordVerificationFailure(task: Task) {
      assertAllowedTransition('verifying', 'failed');
      // Preserve existing semantics: CI failures do not schedule a coding retry.
      return update(task, ['verifying'], {
        status: 'failed',
        nextRetryAt: null,
      });
    },
    recordCompletion(task: Task) {
      assertAllowedTransition('verifying', 'done');
      // Preserve existing behavior: merged tasks are deleted, not retained as done.
      return database
        .delete(tasks)
        .where(ownsAttempt(task, ['verifying']))
        .returning()
        .get();
    },
  };
}
export type TaskStore = ReturnType<typeof createTaskStore>;
