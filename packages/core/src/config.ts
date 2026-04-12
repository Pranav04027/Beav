import dotenv from "dotenv"
dotenv.config()
import { WorkflowSchema, type Workflow } from "./types.js"

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Workflow {
  return WorkflowSchema.parse({
    ghToken: env.GITHUB_TOKEN,
    repoOwner: env.REPO_OWNER,
    repoName: env.REPO_NAME,
    issueTitle: env.ISSUE_TITLE,
    maxConcurrent: env.MAX_CONCURRENT,
    pollIntervalMs: env.POLL_INTERVAL_MS,
    thresholdMs: env.THRESHOLD_MS,
    workspaceRoot: env.WORKSPACE_ROOT,
  });
}
