import { Octokit } from '@octokit/rest';
import { TrackedIssueSchema } from '@beav/core/types';
import type { Config, Task } from '@beav/core';
import * as logger from '@beav/core/logger';

export type PullRequestState =
  | 'merged'
  | 'closed'
  | 'failed'
  | 'passed'
  | 'pending'
  | 'no-checks';

export function createGitHubClient(
  config: Config,
  client: InstanceType<typeof Octokit> = new Octokit({ auth: config.ghToken }),
) {
  return {
    async fetchIssues() {
      const { data } = await client.rest.issues.listForRepo({
        owner: config.repoOwner,
        repo: config.repoName,
        labels: config.issueLabel,
        state: 'open',
      });
      return data.flatMap((issue) => {
        if (issue.pull_request) return [];
        const result = TrackedIssueSchema.safeParse({
          githubIssueId: issue.id,
          githubIssueNumber: issue.number,
          issueTitle: issue.title,
          htmlUrl: issue.html_url,
          repoOwner: config.repoOwner,
          repoName: config.repoName,
          body: issue.body ?? null,
        });
        if (!result.success) {
          logger.warn('github', 'Skipping invalid issue #' + issue.number);
          return [];
        }
        return [result.data];
      });
    },
    async checkPullRequest(
      task: Pick<Task, 'repoOwner' | 'repoName' | 'prNumber'>,
    ): Promise<PullRequestState> {
      if (task.prNumber === null) return 'failed';
      const { data: pr } = await client.pulls.get({
        owner: task.repoOwner,
        repo: task.repoName,
        pull_number: task.prNumber,
      });
      if (pr.merged_at) return 'merged';
      if (pr.state === 'closed') return 'closed';
      const { data } = await client.checks.listForRef({
        owner: task.repoOwner,
        repo: task.repoName,
        ref: pr.head.sha,
      });
      if (data.check_runs.length === 0) return 'no-checks';
      if (data.check_runs.some((run) => run.conclusion === 'failure'))
        return 'failed';
      if (
        data.check_runs.every(
          (run) => run.status === 'completed' && run.conclusion === 'success',
        )
      )
        return 'passed';
      return 'pending';
    },
  };
}
export type GitHubClient = ReturnType<typeof createGitHubClient>;
