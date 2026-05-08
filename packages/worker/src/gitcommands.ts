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

async function prExists(branch: string, cwd: string): Promise<{ exists: boolean; number: number | null; url: string | null }> {
  try {
    const res = await run(
      'gh',
      ['pr', 'list', '--head', branch, '--json', 'number,url', '--jq', '.[0]'],
      cwd,
    );
    const trimmed = res.trim();
    if (!trimmed) {
      return { exists: false, number: null, url: null };
    }
    const pr = JSON.parse(trimmed);
    return { exists: true, number: pr.number, url: pr.url };
  } catch {
    return { exists: false, number: null, url: null };
  }
}

export async function createPR(task: Task): Promise<{ prNumber: number; prUrl: string } | false> {
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

  const existing = await prExists(branch, cwd);

  if (!existing.exists) {
    console.error(`[pr] Creating PR for ${branch} → #${task.githubIssueNumber}`);
    try {
      const prUrl = await run(
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
      const cleanUrl = prUrl.trim();
      console.error('[pr] PR created successfully:', cleanUrl);
      const prNumber = parseInt(cleanUrl.split('/').pop()!, 10);
      return { prNumber, prUrl: cleanUrl };
    } catch (error) {
      console.error('[pr] PR creation failed:', error);
      return false;
    }
  } else {
    console.error('[pr] PR already exists → skipping');
    return { prNumber: existing.number!, prUrl: existing.url! };
  }
}
