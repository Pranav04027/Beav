import { z } from 'zod';
import type { InferSelectModel } from 'drizzle-orm';
import type { tasks } from './schema.js';

export type Task = InferSelectModel<typeof tasks>;
export type { TaskStatus } from './state-machine.js';

const numberSetting = (schema: z.ZodNumber, fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? fallback : Number(value)),
    schema,
  );

export const ConfigSchema = z.object({
  ghToken: z.string().min(1, 'GitHub token is required'),
  repoOwner: z.string().min(1),
  repoName: z.string().min(1),
  issueLabel: z.string().default('autofix'),
  maxConcurrent: numberSetting(z.number().int().positive(), 3),
  pollIntervalMs: numberSetting(z.number().min(5000), 30_000),
  thresholdMs: numberSetting(z.number().positive(), 45_000),
  workspaceRoot: z.string().min(1),
  databasePath: z.string().min(1),
});
export type Config = z.infer<typeof ConfigSchema>;

export const TrackedIssueSchema = z.object({
  githubIssueId: z.number().int(),
  githubIssueNumber: z.number().int().positive(),
  issueTitle: z.string(),
  repoOwner: z.string().min(1),
  repoName: z.string().min(1),
  htmlUrl: z.string().url(),
  body: z.string().nullable(),
});
export type TrackedIssue = z.infer<typeof TrackedIssueSchema>;
