import { CommandError, runCommand } from '@beav/core/commands';
import type { AssignedTask } from '@beav/core/worker-events';

export interface PullRequest {
  prNumber: number;
  prUrl: string;
}

function parsePullRequest(value: unknown): PullRequest {
  const pr = value as { number?: unknown; url?: unknown } | null;
  if (
    !pr ||
    !Number.isInteger(pr.number) ||
    Number(pr.number) <= 0 ||
    typeof pr.url !== 'string'
  ) {
    throw new Error('GitHub CLI returned an invalid pull request');
  }
  new URL(pr.url);
  return { prNumber: Number(pr.number), prUrl: pr.url };
}

export async function createPR(
  task: AssignedTask,
  signal?: AbortSignal,
  run = runCommand,
): Promise<PullRequest> {
  const cwd = task.workspacePath;
  const branch = 'beav-fix-' + task.id;
  await run('git', ['checkout', '-B', branch], cwd, signal);
  await run('git', ['add', '.'], cwd, signal);
  try {
    await run('git', ['diff', '--cached', '--quiet'], cwd, signal);
    throw new Error('Agent produced no changes to publish');
  } catch (error) {
    // git diff exit 1 means changes; other errors must not become commits.
    if (!(error instanceof CommandError) || error.exitCode !== 1) throw error;
  }
  await run(
    'git',
    ['commit', '-m', 'fix: ' + task.issueTitle.replace(/[\n\r]/g, ' ')],
    cwd,
    signal,
  );
  await run('git', ['push', '-u', 'origin', branch], cwd, signal);
  const existing = await run(
    'gh',
    ['pr', 'list', '--head', branch, '--json', 'number,url', '--jq', '.[0]'],
    cwd,
    signal,
  );
  if (existing.trim()) return parsePullRequest(JSON.parse(existing));

  const url = (
    await run(
      'gh',
      [
        'pr',
        'create',
        '--base',
        'main',
        '--head',
        branch,
        '--title',
        task.issueTitle,
        '--body',
        'Auto fix\n\nCloses #' + task.githubIssueNumber,
      ],
      cwd,
      signal,
    )
  ).trim();
  const number = Number(new URL(url).pathname.split('/').pop());
  return parsePullRequest({ number, url });
}
