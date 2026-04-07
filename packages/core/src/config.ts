import dotenv from "dotenv"
dotenv.config()
import { WorkflowSchema, type Workflow } from "./types.js"

const rawConfig = {
  ghToken: process.env.GITHUB_TOKEN,
  repoOwner: process.env.REPO_OWNER,
  repoName: process.env.REPO_NAME,
  issueTitle: process.env.ISSUE_TITLE,
  maxConcurrent: process.env.MAX_CONCURRENT,
  pollIntervalMs: process.env.POLL_INTERVAL_MS,
  workspaceRoot: process.env.WORKSPACE_ROOT,
};

export const config = WorkflowSchema.parse(rawConfig)
