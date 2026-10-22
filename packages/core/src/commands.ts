import { spawn } from 'node:child_process';

export class CommandError extends Error {
  constructor(
    public readonly command: string,
    public readonly exitCode: number | null,
    detail: string,
  ) {
    super(command + ' failed (' + (exitCode ?? 'signal') + '): ' + detail);
  }
}

export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...(signal ? { signal } : {}),
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    proc.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    proc.once('error', reject);
    proc.once('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new CommandError(command, code, stderr.trim()));
    });
  });
}
