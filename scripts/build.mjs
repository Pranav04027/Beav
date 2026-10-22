import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const checkOnly = process.argv.includes('--check');
for (const name of ['core', 'tracker', 'worker', 'orchestrator', 'cli']) {
  const cwd = path.join(root, 'packages', name);
  if (!checkOnly)
    rmSync(path.join(cwd, 'dist'), { recursive: true, force: true });
  const compiler = path.join(cwd, 'node_modules', 'typescript', 'bin', 'tsc');
  const result = spawnSync(
    process.execPath,
    [
      compiler,
      '-p',
      'tsconfig.json',
      '--incremental',
      'false',
      ...(checkOnly ? ['--noEmit'] : []),
    ],
    { cwd, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(name + (checkOnly ? ': types OK' : ': built'));
}
