import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  symlink,
  readFile,
  writeFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  workspacePath,
  validateWorkspace,
  removeWorkspace,
} from '../dist/workspace.js';
import { applicationPaths, loadConfig } from '../dist/config.js';

test('workspace paths reject traversal and root deletion; accept old ULIDs', () => {
  for (const id of [
    '',
    '.',
    '..',
    '../outside',
    '/tmp/outside',
    'a/b',
    'a\\b',
  ]) {
    assert.throws(() => workspacePath(id, '/tmp/root'));
  }
  assert.equal(workspacePath('01OLDULID', '/tmp/root'), '/tmp/root/01OLDULID');
  assert.throws(() =>
    validateWorkspace('task-1', '/tmp/root', '/tmp/elsewhere'),
  );
});

test('cleanup removes the task symlink itself, leaving its target untouched', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'beav-workspace-'));
  try {
    const outside = path.join(root, 'outside');
    const workspace = path.join(root, 'workspaces');
    await mkdir(outside);
    await mkdir(workspace);
    await writeFile(path.join(outside, 'keep'), 'keep');
    await symlink(outside, path.join(workspace, 'task-1'));
    await removeWorkspace('task-1', workspace);
    await removeWorkspace('task-1', workspace); // cleanup is repeatable
    assert.equal(await readFile(path.join(outside, 'keep'), 'utf8'), 'keep');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('configuration uses absolute stable paths and accepts the legacy issue-label variable', () => {
  const env = {
    GITHUB_TOKEN: 'test',
    REPO_OWNER: 'owner',
    REPO_NAME: 'repo',
    ISSUE_TITLE: 'legacy',
  };
  const config = loadConfig(env, '/tmp/beav-config');
  assert.equal(config.issueLabel, 'legacy');
  assert.equal(config.databasePath, '/tmp/beav-config/beav.db');
  assert.equal(config.workspaceRoot, '/tmp/beav-config/workspaces');
  assert.equal(
    applicationPaths({ DATABASE_PATH: '/tmp/explicit.db' }).databasePath,
    '/tmp/explicit.db',
  );
  assert.throws(() => loadConfig({ ...env, MAX_CONCURRENT: '1.5' }));
});

test('cleanup refuses a symlinked workspace root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'beav-root-link-'));
  try {
    await mkdir(path.join(root, 'outside'));
    await mkdir(path.join(root, 'outside', 'task-1'));
    await writeFile(path.join(root, 'outside', 'task-1', 'keep'), 'keep');
    await symlink(path.join(root, 'outside'), path.join(root, 'workspaces'));
    await assert.rejects(
      removeWorkspace('task-1', path.join(root, 'workspaces')),
      /symlink/,
    );
    assert.equal(
      await readFile(path.join(root, 'outside', 'task-1', 'keep'), 'utf8'),
      'keep',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
