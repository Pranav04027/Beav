import { spawn } from 'node:child_process';
import { type Task } from '@beav/core';

function run(command: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(stderr || `Command failed with exit code ${code}`);
    });
  });
}

async function prExists(branch: string, cwd: string) {
  try {
    const res = await run(
      'gh',
      ['pr', 'list', '--head', branch, '--json', 'number', '--jq', '.[0].number'],
      cwd,
    );
    return res.trim() !== '';
  } catch {
    return false;
  }
}

export async function createPR(task: Task): Promise<boolean> {
  const cwd = task.workspacePath;
  if (!cwd) {
    throw new Error(`Task ${task.id} is missing workspacePath`);
  }
  const branch = `beav-fix-${task.id}`;

  console.error(`[pr] Creating branch: ${branch}`);
  await run('git', ['checkout', '-B', branch], cwd);

  console.error('[pr] Staging changes...');
  await run('git', ['add', '.'], cwd);

  // avoid empty commit
  try {
    await run('git', ['diff', '--cached', '--quiet'], cwd);
    console.error('[pr] No changes to commit → skipping');
    return false;
  } catch {
    const safeTitle = task.issueTitle.replace(/[\n\r]/g, ' ');
    console.error(`[pr] Committing: fix: ${safeTitle}`);
    await run('git', ['commit', '-m', `fix: ${safeTitle}`], cwd);
  }

  console.error('[pr] Pushing branch to origin...');
  await run('git', ['push', '-u', 'origin', branch], cwd);

  const exists = await prExists(branch, cwd);

  if (!exists) {
    console.error(`[pr] Creating PR for ${branch} → #${task.githubIssueNumber}`);
    try {
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
          `Auto fix\n\nCloses #${task.githubIssueNumber}`,
        ],
        cwd,
      );
      console.error('[pr] PR created successfully');
      return true;
    } catch (error) {
      console.error('[pr] PR creation failed:', error);
      return false;
    }
  } else {
    console.error('[pr] PR already exists → skipping');
    return true;
  }
}
