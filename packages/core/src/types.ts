import { z } from "zod"
import { tasks } from "./schema.js";
import type { InferSelectModel } from "drizzle-orm";

export type Task = InferSelectModel<typeof tasks>;

const optionalNumberFromEnv = (schema: z.ZodNumber) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === "") {
      return undefined;
    }

    const parsed = Number(val);
    return Number.isNaN(parsed) ? val : parsed;
  }, schema.optional());

export const WorkflowSchema = z.object({
    ghToken: z.string().min(1, "Github Token is required"),
    repoOwner: z.string().min(1),
    repoName: z.string().min(1),
    issueTitle: z.string().default("autofix"),
    maxConcurrent: optionalNumberFromEnv(z.number().positive()).default(3),
    pollIntervalMs: optionalNumberFromEnv(z.number().min(5000)).default(30000),
    thresholdMs: optionalNumberFromEnv(z.number().positive()).default(45000),
    workspaceRoot: z.string().default("./workspaces")
})

export const TrackedIssueSchema = z.object({
    githubIssueId: z.number(),
    githubIssueNumber: z.number(),
    issueTitle: z.string(),
    repoOwner: z.string(),
    htmlUrl: z.string().url(),
    body: z.string().nullable(),
    repoName: z.string()
})

export type Workflow = z.infer<typeof WorkflowSchema>;
export type TrackedIssue = z.infer<typeof TrackedIssueSchema>;

export const TaskStatusEnum = z.enum([
  'pending', 
  'claimed', 
  'running', 
  'verifying', 
  'done', 
  'failed', 
  'crashed'
]);

export type TaskStatus = z.infer<typeof TaskStatusEnum>;
