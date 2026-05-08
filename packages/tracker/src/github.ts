import { Octokit } from '@octokit/rest';
import { TrackedIssueSchema, type TrackedIssue, logger } from '@beav/core';
import { db, eq } from '@beav/core';
import { tasks } from '@beav/core';
import { ulid } from 'ulid';
import { type Workflow } from '@beav/core';

export async function fetchIssue(
  owner: string,
  repo: string,
  label: string,
  ghToken: string,
) {
  logger.info('tracker', `Fetching open issues from ${owner}/${repo} with label "${label}"`);

  try {
    const octokit = new Octokit({
      auth: ghToken,
    });

    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      labels: label,
      state: 'open',
    });

    logger.info('tracker', `Found ${data.length} open issue(s) with label "${label}"`);

    const errors: unknown[] = [];
    let added = 0;
    let skipped = 0;

    for (const issue of data) {
      const clean = TrackedIssueSchema.safeParse({
        githubIssueId: issue.id,
        githubIssueNumber: issue.number,
        issueTitle: issue.title,
        htmlUrl: issue.html_url,
        repoOwner: owner,
        repoName: repo,
        body: issue.body || null,
      });

      if (!clean.success) {
        logger.warn('tracker', `Validation failed for issue #${issue.number} (ID: ${issue.id})`);
        errors.push({
          type: 'VALIDATION_ERROR',
          issueNumber: issue.number,
          detail: clean.error.flatten(),
        });
        skipped++;
        continue;
      }

      const error = await savetoDB(clean.data);
      if (error) {
        logger.warn('tracker', `Database conflict for issue #${issue.number}: ${error instanceof Error ? error.message : String(error)}`);
        errors.push(error);
        skipped++;
        continue;
      }

      added++;
      logger.info('tracker', `Tracked issue #${issue.number}: ${issue.title}`);
    }

    logger.info('tracker', `Sync complete: ${added} added, ${skipped} skipped`);

    return {
      added,
      skipped,
      errors,
    };
  } catch (error) {
    logger.error('tracker', `GitHub API fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      added: 0,
      skipped: 0,
      errors: [
        {
          type: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

async function mark(id: string, status: "done" | "failed") {
  await db.update(tasks)
    .set({ status })
    .where(eq(tasks.id, id));

  logger.info(`verify:${id}`, `Marked as ${status}`);
}

export async function checkVerifyingTasks(config: Workflow) {
  const verifying = await db.query.tasks.findMany({
    where: eq(tasks.status, "verifying"),
  });

  if (verifying.length === 0) return;

  logger.info('verifier', `Checking ${verifying.length} verifying task(s)`);

  const octokit = new Octokit({
    auth: config.ghToken
  });

  const concurrency = 5;

  const verifyTask = async (task: Awaited<typeof verifying>[number]) => {
    try {
      if (task.prNumber == null) {
        logger.error(`verify:${task.id}`, "Missing prNumber → failed");
        await mark(task.id, "failed");
        return;
      }

      const { data: pr } = await octokit.pulls.get({
        owner: task.repoOwner,
        repo: task.repoName,
        pull_number: task.prNumber,
      });

      logger.info(`verify:${task.id}`, `PR #${pr.number}: state=${pr.state}, merged=${pr.merged_at != null}`);

      // merged = done
      if (pr.merged_at) {
        await mark(task.id, "done");
        return;
      }

      // closed without merge = failed
      if (pr.state === "closed") {
        await mark(task.id, "failed");
        return;
      }

      const { data } = await octokit.checks.listForRef({
        owner: task.repoOwner,
        repo: task.repoName,
        ref: pr.head.sha,
      });

      const runs = data.check_runs;

      // no CI = done
      if (runs.length === 0) {
        logger.info(`verify:${task.id}`, "No CI checks found → marking done");
        await mark(task.id, "done");
        return;
      }

      logger.info(`verify:${task.id}`, `${runs.length} check run(s) found`);

      // any fail = failed
      if (runs.some(r => r.conclusion === "failure")) {
        logger.info(`verify:${task.id}`, "At least one check failed → marking failed");
        await mark(task.id, "failed");
        return;
      }

      // all success = done
      if (
        runs.every(
          r =>
            r.status === "completed" &&
            r.conclusion === "success"
        )
      ) {
        logger.info(`verify:${task.id}`, "All checks passed → marking done");
        await mark(task.id, "done");
        return;
      }

      logger.info(`verify:${task.id}`, "Checks still in progress → staying verifying");

    } catch (err) {
      logger.error(`verify:${task.id}`, `Verification error`, err);
    }
  };

  for (let index = 0; index < verifying.length; index += concurrency) {
    const batch = verifying.slice(index, index + concurrency);
    logger.info('verifier', `Processing batch ${Math.floor(index / concurrency) + 1} (${batch.length} tasks)`);
    await Promise.allSettled(batch.map(verifyTask));
  }
}

async function savetoDB(task: TrackedIssue) {
  try {
    await db
      .insert(tasks)
      .values({
        id: ulid(),
        ...task,
        status: 'pending',
        createdAt: Date.now(),
      })
      .onConflictDoNothing({
        target: [tasks.repoOwner, tasks.repoName, tasks.githubIssueNumber],
      });
    return null;
  } catch (error) {
    return error;
  }
}
