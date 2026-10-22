import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { ConfigSchema } from './types.js';

// Preserve the directory used by the original root pnpm start command.
export const applicationDirectory = fileURLToPath(
  new URL('../../cli/', import.meta.url),
);

export function loadEnvironment(directory = applicationDirectory) {
  dotenv.config({ path: path.join(directory, '.env'), quiet: true });
}

export function applicationPaths(
  env: NodeJS.ProcessEnv = process.env,
  directory = applicationDirectory,
) {
  return {
    databasePath: path.resolve(directory, env.DATABASE_PATH ?? 'beav.db'),
    workspaceRoot: path.resolve(directory, env.WORKSPACE_ROOT ?? 'workspaces'),
  };
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  directory = applicationDirectory,
) {
  return ConfigSchema.parse({
    ghToken: env.GITHUB_TOKEN,
    repoOwner: env.REPO_OWNER,
    repoName: env.REPO_NAME,
    issueLabel: env.ISSUE_LABEL ?? env.ISSUE_TITLE,
    maxConcurrent: env.MAX_CONCURRENT,
    pollIntervalMs: env.POLL_INTERVAL_MS,
    thresholdMs: env.THRESHOLD_MS,
    ...applicationPaths(env, directory),
  });
}
