# Beav 🦫

Autonomous GitHub issue resolution system powered by Codex AI agents.

Beav monitors repositories for labeled issues, spawns isolated parallel workers using OpenAI Codex, creates pull requests, verifies CI, and automatically retries failed executions.

## Demo

## System Evolution

Beav evolved through two major architectural phases.

### Phase 1 — Fully Custom Agent Architecture

![System Architecture 1](images/systemArchitecture1.png)

The initial version of Beav implemented a fully custom autonomous agent pipeline.

The worker layer was responsible for:
- agent reasoning
- tool execution
- memory persistence
- retry coordination
- heartbeat tracking

This architecture focused heavily on building a stateful ReAct-style execution loop from scratch, with the orchestrator managing recovery, retries, and workspace isolation around it.

### Phase 2 — Codex-Native Orchestration Architecture

![System Architecture 2](images/systemArchitecture2.png)

The architecture later evolved into a Codex-native distributed system.

Instead of implementing custom reasoning internally, Beav now delegates:
- code reasoning
- iterative debugging
- tool usage
- repository modification

to Codex app-server through JSON-RPC IPC communication.

This significantly simplified the worker layer and allowed Beav to focus on:
- orchestration
- concurrent worker execution
- crash recovery
- PR lifecycle management
- CI verification
- task state management

The result is a cleaner and more modular autonomous issue resolution system.

## Execution Flow
![Sequence Diagram](images/BeavTimeFlowDiagram.png)

## Core Concepts

### Stateful Task Lifecycle
### Process Isolation
### Recovery & Retries

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
## Tech Stack

| Layer           | Technology                      |
| --------------- | ------------------------------- |
| Database        | SQLite (WAL mode) + Drizzle ORM |
| API Client      | Octokit REST                    |
| Runtime         | Node.js                         |
| Package Manager | pnpm (monorepo)                 |

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

## Example Run Logs:

## Future Improvements