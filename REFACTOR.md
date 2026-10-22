# Readability refactor

This change keeps the five-package monorepo, Drizzle/SQLite WAL, conditional claims, independent Node workers, IPC, Codex stdin/stdout, seven declared states, heartbeats, retries, task checkouts, Git/PR publication and PR/CI monitoring.

## Ownership changes

- Explicit configuration/database initialization replaces import-time side effects. Root startup retains packages/cli as the default data directory. Environment overrides are absolute after resolution.
- core/task-store.ts owns queries. The tracker returns GitHub data and the orchestrator makes lifecycle decisions.
- worker/run-task.ts expresses heartbeat -> await agent -> publish -> report -> cleanup.
- worker/agent-client.ts encapsulates protocol framing, request correlation, approval responses and terminal notifications.
- orchestrator/worker-events.ts handles validated reports directly. Its former database-forwarding module was removed.
- One retry policy uses the saved maxRetries. Workers report failure kind and reason without deciding retry counts.
- The state-machine class became a transition table with a plain validation function.
- One shared command runner preserves command exit codes. One workspace module handles creation, validation and removal.
- Root build, typecheck, test and runtime commands use compiled JavaScript. Builds remove stale generated output.

## Correctness fixes

- Conditional lifecycle writes include the originating claim timestamp, retry count and expected status. Duplicate or obsolete terminal reports cannot overwrite a newer attempt.
- A start handshake prevents execution before running ownership is persisted. Launch initializes lastHeartbeat; recovery also handles legacy null values.
- Final IPC reports wait for acknowledgement after persistence. Exit recovery drains the child's message queue before deciding that it crashed.
- Agent completion resolves an awaited operation exactly once. Failed/interrupted turns reject. Completion arriving before the turn RPC response is handled. Process close is evaluated after stdout drains.
- Success, timeout, process exit and cleanup no longer launch competing PR/failure paths.
- Parent cleanup kills remaining POSIX worker-group members and validates the workspace path. Linux recovery verifies process identity before using saved PIDs; terminal cleanup has a bounded grace period. The saved path is retained until cleanup succeeds.
- Failure state and diagnostic insertion are transactional; a failed insert rolls back the state change.
- Git diff exit 1 means changes; other Git failures propagate. GitHub CLI errors are no longer interpreted as absence of an existing PR.
- GitHub's issues endpoint can return PRs; these are excluded from issue discovery.
- Status/logs commands now inspect persisted data. The existing manual worker command remains available but requires an atomic pending claim.

## Files and dependencies

Introduced: task-store.ts, commands.ts, agent-client.ts, run-task.ts, manual.ts, scripts/build.mjs, and focused tests.

Removed: orchestrator/worker-event-store.ts (merged into the direct handler/store), tracker/status.ts (unused), cli/fix_done.ts (unconnected ad-hoc deletion script).

Removed packages: ulid and tsx. UUID generation uses node:crypto; queue ordering still uses createdAt. Existing ULIDs remain valid. Removed unused tracker dotenv/zod and orchestrator zod declarations; orchestrator's Drizzle dependency is no longer needed after query centralization. SQLite type definitions moved to development dependencies. The orchestrator now declares its worker workspace dependency explicitly. The lockfile and installed workspace links were synchronized.

## Deliberately preserved behavior

- Merged tasks and cascading logs are deleted, rather than retained as done.
- Verifying tasks consume scheduling capacity.
- Failed CI and closed PRs do not schedule execution retries.
- No persisted columns or diagnostics were dropped; no existing databases were moved or combined.
- GitHub PR base remains main; the agent model and execution access settings remain unchanged.
- Restarting a task starts a fresh checkout and Codex session.

## Verification

Baseline: all five packages passed TypeScript checks. The three existing worker-event tests had one pass and two fixture failures (missing required metadata).

Final verification on Node 20.20.2:

- npm test: all five packages built; 59 tests passed, 0 failed, 0 skipped.
- npm run typecheck: all five packages passed.
- Prettier check: passed for changed source, tests, manifests, scripts and documentation.
- git diff --check: passed.
- Tracked database files: no changes.

The child-process tests required execution outside the tool sandbox because it blocks Node process pipes. The original fixture baseline was confirmed by running its file directly.

The refactored suite covers SQLite WAL and competing conditional claims, rollback of failure/log writes, task deduplication, stale reports, ordered IPC, real parallel Node workers, terminal acknowledgements, crashes and shutdown, RPC framing/correlation/approvals, duplicate and early completion, failed/interrupted turns, unexpected exits, timeout/cancellation, cleanup, PR reuse, Git error handling, local Git commit/push, GitHub check-state mapping, verification semantics, configuration and CLI commands.

Tests use temporary databases/workspaces and substitute GitHub/Codex responses. Live authenticated integrations and production deployments were not exercised. See readme.md for limitations, commands, architecture, and the eight-file reading order.
