import test from 'node:test';
import assert from 'node:assert/strict';
import { createGitHubClient } from '../dist/github.js';

const config = {
  ghToken: 'test',
  repoOwner: 'owner',
  repoName: 'repo',
  issueLabel: 'autofix',
};
const task = { repoOwner: 'owner', repoName: 'repo', prNumber: 1 };

test('fetches and validates eligible issues without writing to SQLite', async () => {
  let argumentsReceived;
  const api = {
    rest: {
      issues: {
        listForRepo: async (args) => {
          argumentsReceived = args;
          return {
            data: [
              {
                id: 1,
                number: 1,
                title: 'fix',
                html_url: 'https://example.com/issue/1',
                body: null,
              },
              {
                id: 2,
                number: 2,
                title: 'PR',
                html_url: 'https://example.com/pr/2',
                pull_request: {},
              },
              { id: 3, number: -1, title: 'bad', html_url: 'invalid' },
            ],
          };
        },
      },
    },
  };
  const result = await createGitHubClient(config, api).fetchIssues();
  assert.equal(result.length, 1);
  assert.equal(result[0].githubIssueNumber, 1);
  assert.equal(argumentsReceived.labels, 'autofix');
});

for (const [name, pr, checks, expected] of [
  ['merged', { merged_at: 'now', state: 'closed' }, [], 'merged'],
  ['closed', { merged_at: null, state: 'closed' }, [], 'closed'],
  ['no checks', { merged_at: null, state: 'open' }, [], 'no-checks'],
  [
    'failed CI',
    { merged_at: null, state: 'open' },
    [{ status: 'completed', conclusion: 'failure' }],
    'failed',
  ],
  [
    'passed CI',
    { merged_at: null, state: 'open' },
    [{ status: 'completed', conclusion: 'success' }],
    'passed',
  ],
  [
    'running CI',
    { merged_at: null, state: 'open' },
    [{ status: 'in_progress', conclusion: null }],
    'pending',
  ],
]) {
  test('reports GitHub status: ' + name, async () => {
    const api = {
      pulls: {
        get: async () => ({ data: { ...pr, head: { sha: 'head-sha' } } }),
      },
      checks: {
        listForRef: async (args) => {
          assert.equal(args.ref, 'head-sha');
          return { data: { check_runs: checks } };
        },
      },
    };
    assert.equal(
      await createGitHubClient(config, api).checkPullRequest(task),
      expected,
    );
  });
}

test('GitHub transport errors propagate without turning into CI failure', async () => {
  const api = {
    pulls: {
      get: async () => {
        throw new Error('rate limited');
      },
    },
  };
  await assert.rejects(
    createGitHubClient(config, api).checkPullRequest(task),
    /rate limited/,
  );
});
