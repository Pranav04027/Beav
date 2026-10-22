import test from 'node:test';
import assert from 'node:assert/strict';
import { createPR } from '../dist/gitcommands.js';
import { CommandError, runCommand } from '@beav/core/commands';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

const task = {
  id: 'task-1',
  githubIssueNumber: 1,
  issueTitle: 'Fix\nbug',
  workspacePath: '/tmp/task-1',
};

test('Git errors do not get mistaken for changes or an absent PR', async () => {
  for (const exitCode of [2, 128]) {
    const calls = [];
    await assert.rejects(
      createPR(task, undefined, async (cmd, args) => {
        calls.push(args[0]);
        if (args[0] === 'diff')
          throw new CommandError(cmd, exitCode, 'git error');
        return '';
      }),
      /git error/,
    );
    assert.equal(calls.includes('commit'), false);
  }
});

test('no changes are a publication failure, with no empty commit', async () => {
  await assert.rejects(
    createPR(task, undefined, async () => ''),
    /no changes/,
  );
});

test('an existing PR is reused and API errors are propagated', async () => {
  const calls = [];
  const run = async (cmd, args) => {
    calls.push(args[0] + '/' + args[1]);
    if (args[0] === 'diff') throw new CommandError('git', 1, '');
    if (cmd === 'gh')
      return JSON.stringify({ number: 10, url: 'https://example.com/pr/10' });
    return '';
  };
  assert.equal((await createPR(task, undefined, run)).prNumber, 10);
  assert.equal(calls.includes('pr/create'), false);
  await assert.rejects(
    createPR(task, undefined, async (cmd, args) => {
      if (args[0] === 'diff') throw new CommandError('git', 1, '');
      if (cmd === 'gh') throw new Error('authentication failed');
      return '';
    }),
    /authentication failed/,
  );
});

test('real local Git branch, commit and push with a substitute GitHub CLI response', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'beav-git-'));
  try {
    const repo = path.join(root, 'repo');
    const remote = path.join(root, 'remote.git');
    await mkdir(repo);
    await runCommand('git', ['init', '--bare', remote], root);
    await runCommand('git', ['init', '-b', 'main'], repo);
    await runCommand('git', ['config', 'user.name', 'Beav Test'], repo);
    await runCommand('git', ['config', 'user.email', 'beav@example.com'], repo);
    await writeFile(path.join(repo, 'file.txt'), 'initial\n');
    await runCommand('git', ['add', '.'], repo);
    await runCommand('git', ['commit', '-m', 'initial'], repo);
    await runCommand('git', ['remote', 'add', 'origin', remote], repo);
    await writeFile(path.join(repo, 'file.txt'), 'fixed\n');
    const result = await createPR(
      { ...task, workspacePath: repo },
      undefined,
      async (cmd, args, cwd, signal) => {
        if (cmd === 'gh')
          return args[1] === 'list' ? '' : 'https://example.com/pr/12\n';
        return runCommand(cmd, args, cwd, signal);
      },
    );
    assert.equal(result.prNumber, 12);
    assert.equal(
      (await runCommand('git', ['branch', '--show-current'], repo)).trim(),
      'beav-fix-task-1',
    );
    assert.equal(
      (await runCommand('git', ['log', '-1', '--format=%s'], repo)).trim(),
      'fix: Fix bug',
    );
    assert.match(
      await runCommand(
        'git',
        ['--git-dir', remote, 'show', 'beav-fix-task-1:file.txt'],
        root,
      ),
      /fixed/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
