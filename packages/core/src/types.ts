import { z } from "zod"

export const WorkflowSchema = z.object({
    ghToken: z.string().min(1, "Github Token is required"),
    repoOwner: z.string().min(1),
    repoName: z.string().min(1),
    issueTitle: z.string().default("autofix"),
    maxConcurrent: z.preprocess((val) => Number(val), z.number().positive().default(3)),
    pollIntervalMs: z.preprocess((val) => Number(val), z.number().min(5000).default(30000)),
    thresholdMs: z.preprocess((val) => Number(val), z.number().default(45000)),
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
