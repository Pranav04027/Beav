import { Octokit } from '@octokit/rest';
import { TrackedIssueSchema, type TrackedIssue } from '@beav/core';
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

    const errors = [];
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
        console.error(`tracker/github.ts failed to parse Issue ID:${issue.id}`);
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
        errors.push(error);
        skipped++;
        continue;
      }
      added++;
    }

    return {
      added,
      skipped,
      errors: errors,
    };
  } catch (error) {
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
}

export async function checkVerifyingTasks(config: Workflow) {
  const octokit = new Octokit({
    auth: config.ghToken
  });

  const verifying = await db.query.tasks.findMany({
    where: eq(tasks.status, "verifying"),
  });

  const concurrency = 5;

  const verifyTask = async (task: Awaited<typeof verifying>[number]) => {
    try {
      if (task.prNumber == null) {
        console.error(`Verifier error for ${task.id}: missing prNumber`);
        await mark(task.id, "failed");
        return;
      }

      const { data: pr } = await octokit.pulls.get({
        owner: task.repoOwner,
        repo: task.repoName,
        pull_number: task.prNumber,
      });

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
        await mark(task.id, "done");
        return;
      }

      // any fail = failed
      if (runs.some(r => r.conclusion === "failure")) {
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
        await mark(task.id, "done");
      }

      // else remain verifying

    } catch (err) {
      console.error(`Verifier error for ${task.id}`, err);
    }
  }

  for (let index = 0; index < verifying.length; index += concurrency) {
    const batch = verifying.slice(index, index + concurrency);
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
