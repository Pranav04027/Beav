import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));

test('utility imports do not initialize SQLite, load .env or mutate the working directory', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'beav-import-'));
  try {
    const modules = [
      'index',
      'config',
      'logger',
      'worker-events',
      'task-store',
    ];
    const code =
      modules
        .map(
          (name) =>
            'await import(' +
            JSON.stringify(
              new URL('../../core/dist/' + name + '.js', import.meta.url).href,
            ) +
            ');',
        )
        .join('\n') +
      '\nif (process.env.GITHUB_TOKEN !== undefined) throw new Error("Configuration was loaded");';
    const env = { ...process.env };
    delete env.GITHUB_TOKEN;
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', code],
      { cwd: directory, encoding: 'utf8', env },
    );
    if (result.error) throw result.error;
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readdirSync(directory), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI status and logs inspect an explicit isolated database', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'beav-cli-'));
  try {
    const env = {
      ...process.env,
      DATABASE_PATH: path.join(directory, 'tasks.db'),
    };
    for (const command of ['status', 'logs']) {
      const result = spawnSync(process.execPath, [cli, command], {
        env,
        encoding: 'utf8',
      });
      if (result.error) throw result.error;
      assert.equal(result.status, 0, result.stderr);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
