import path from 'node:path';
import fs from 'node:fs/promises';
import { runCommand } from './commands.js';

export function workspacePath(taskId: string, root: string) {
  // Accept old ULIDs and new UUIDs; reject root itself, traversal and nested paths.
  if (!/^[a-zA-Z0-9-]+$/.test(taskId))
    throw new Error('Invalid workspace task ID: ' + taskId);
  return path.join(path.resolve(root), taskId);
}

export function validateWorkspace(
  taskId: string,
  root: string,
  directory: string,
) {
  const expected = workspacePath(taskId, root);
  if (path.resolve(directory) !== expected)
    throw new Error('Workspace path escapes task directory: ' + directory);
  return expected;
}

export async function removeWorkspace(taskId: string, root: string) {
  const directory = workspacePath(taskId, root);
  try {
    if ((await fs.lstat(path.resolve(root))).isSymbolicLink())
      throw new Error('Workspace root must not be a symlink');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  await fs.rm(directory, { recursive: true, force: true });
}

export async function prepareWorkspace(
  taskId: string,
  owner: string,
  repo: string,
  root: string,
  signal?: AbortSignal,
) {
  const directory = workspacePath(taskId, root);
  await fs.mkdir(path.resolve(root), { recursive: true });
  // Lexical checks are workspace isolation, not an OS sandbox.
  await removeWorkspace(taskId, root);
  await fs.mkdir(directory);
  await runCommand(
    'git',
    [
      'clone',
      '--depth',
      '1',
      'https://github.com/' + owner + '/' + repo + '.git',
      '.',
    ],
    directory,
    signal,
  );
  return directory;
}
