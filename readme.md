# Beav

Autonomous issue resolution agent with GitHub integration and automated PR workflow.

## Overview

Beav monitors GitHub repositories for labeled issues, autonomously analyzes them, applies fixes, and submits pull requests — handling failures and retries automatically.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Beav                             │
├─────────────────────────────────────────────────────────┤
│  Tracker     │ Fetches labeled issues from GitHub     │
│  Orchestrator │ Manages task lifecycle & dispatching   │
│  Worker       │ Executes fixes in isolated workspaces  │
│  CLI          │ User interface for status & logs       │
└─────────────────────────────────────────────────────────┘
```

## Key Features

- **State Machine**: Full task lifecycle (pending → claimed → running → verifying → done)
- **Crash Recovery**: Automatic detection and requeue of failed tasks with exponential backoff
- **Concurrency Control**: Configurable max concurrent workers
- **Workspace Isolation**: Each task runs in a fresh git-cloned workspace with path traversal protection
- **GitHub Integration**: Octokit-based issue tracking with deduplication
- **Process Guard**: Child process PID tracking for force-kill on heartbeat failure

## Tech Stack

| Layer           | Technology                      |
| --------------- | ------------------------------- |
| Database        | SQLite (WAL mode) + Drizzle ORM |
| API Client      | Octokit REST                    |
| Runtime         | Node.js                         |
| Package Manager | pnpm (monorepo)                 |

## Project Structure

```
packages/
├── core/          # Shared types, schema, state machine, database
├── tracker/       # GitHub issue fetching & deduplication
├── orchestrator/  # Task scheduling, dispatch, recovery, workspaces
├── worker/        # Agent execution & PR creation
└── cli/           # User-facing commands (start, status, logs)
```

## Getting Started

```bash
pnpm install
pnpm build
```

Configure via environment or `beav.config.ts`:

```typescript
{
  ghToken: process.env.GITHUB_TOKEN,
  repoOwner: "owner",
  repoName: "repo",
  issueTitle: "autofix",
  maxConcurrent: 3,
  pollIntervalMs: 30000,
  thresholdMs: 45000,
  workspaceRoot: "./workspaces"
}
```

```bash
beav start    # Start orchestrator
beav status   # View active tasks
beav logs <id># Tail task logs
```

## Task Lifecycle

```
pending → claimed → running → verifying → done
    ↑                  ↓
    └───── crashed ←───┘
              ↓
         (retries)
              ↓
           failed
```

Tasks transition to `crashed` on worker failure or heartbeat timeout. After max retries, they reach `failed`. The orchestrator automatically requeues eligible tasks on each tick.
