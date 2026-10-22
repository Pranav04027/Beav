# Codex conversation

## User

# Beav — Final Resume-Driven Interview Preparation

I am preparing for a campus technical interview at **Restroworks for the MEAN Stack Developer position**.

This repository contains my second resume project, **Autonomous AI Orchestrator (Beav)**.

I have very limited preparation time. I need to understand this project well enough to confidently defend the **three resume bullets the interviewer will actually see**.

I do NOT want a complete repository walkthrough, exhaustive documentation, or a lengthy technical textbook.

I want you to act as:
1. A senior backend engineer inspecting my actual implementation.
2. An excellent teacher explaining unfamiliar systems concepts simply.
3. A strict technical interviewer who knows only my three resume bullets and asks follow-up questions based on them.

## THE THREE RESUME BULLETS

**Project: Autonomous AI Orchestrator | TypeScript, Node.js, SQLite, Drizzle ORM**

**Bullet 1 — Architecture**
"Architected a 5-package TypeScript monorepo that detects GitHub issues, executes an LLM coding agent through JSON-RPC 2.0 over stdin/stdout, creates pull requests, and monitors CI completion."

**Bullet 2 — Reliability**
"Designed a 7-state execution machine with heartbeat-based crash detection and sandboxed workspaces, protecting agent execution against path traversal while allowing failed tasks to recover safely."

**Bullet 3 — Concurrency**
"Enabled reliable parallel workers using SQLite WAL mode and atomic state transitions to reduce database contention and prevent inconsistent task lifecycle updates."

**IMPORTANT:** Assume these three bullets are the interviewer's only information about Beav. Derive likely questions from their wording, rather than from every technology or feature appearing in the repository.

## BEFORE WRITING

Inspect the relevant source files, architecture, schemas, implementation, and existing tests.

For each bullet:
- Verify what was actually implemented.
- Identify the exact relevant functions and files.
- Distinguish implementation from intended behavior or unverified claims.
- Identify important limitations or technical inaccuracies in my resume.
- Do not invent mechanisms or assume that planned features work.
- Do not modify any repository files.

Your output should be a **self-contained, concise but genuinely understandable interview preparation guide**.

Target approximately 2,500–3,500 words, prioritizing clarity and completeness of the important material over hitting an exact word count.

---

# PART 1 — UNDERSTAND BEAV ONCE

Keep this section short but clear.

### A. What is Beav?

Explain in beginner-friendly language:
- What problem does it solve?
- Who or what uses it?
- What does "autonomous AI orchestrator" actually mean here?
- What are its five packages, and why separate them?

Give me a natural 60–90-second project introduction suitable for an entry-level software development interview.

### B. Trace ONE complete task

Take a hypothetical GitHub issue, such as:

"Fix a login validation bug."

Trace what happens from the moment Beav discovers the issue until the coding agent works on it, creates a PR, and CI finishes.

Explain:
- Which component initiates each step.
- What data is passed to the next component.
- Which important functions execute.
- What gets written to the database.
- Where an external process is spawned.
- Where failures can occur.

Provide ONE compact ASCII architecture/lifecycle diagram.

This should give me a mental model of the entire system before diving into resume-specific details.

Do not dump entire files.

---

# PART 2 — DEFEND BULLET 1: ARCHITECTURE

"Architected a 5-package TypeScript monorepo that detects GitHub issues, executes an LLM coding agent through JSON-RPC 2.0 over stdin/stdout, creates pull requests, and monitors CI completion."

Teach me what this statement means technically.

Focus on:

1. **Monorepo:** What is a monorepo? What are the five packages, their roles, dependencies, and communication boundaries? Why use a monorepo rather than separate repositories?

2. **GitHub integration:** How are issues discovered? Polling, webhooks, or something else? How does Beav decide that an issue is eligible for processing?

3. **LLM coding agent:** What exactly is the agent doing? What is the difference between Beav orchestrating work and the agent actually writing code?

4. **JSON-RPC 2.0:** What is it? What does a request and response look like? Explain JSON-RPC using an actual or simplified message based on the implementation.

5. **stdin/stdout:** What are standard input and standard output? How does one Node.js process communicate with another process through them? Why was this chosen instead of HTTP?

6. **Process execution:** How is the subprocess started, monitored, stopped, or cleaned up? Explain relevant Node.js asynchronous/process APIs.

7. **Pull requests and CI:** How are commits/PRs created, and how does the system know whether CI passed or failed?

For the most important choices, explain WHY the implementation uses this approach and what alternatives exist.

Finish this section with:
- A natural first-person explanation of Bullet 1 (30–45 seconds).
- The **four most likely interviewer follow-up questions**, each with a clear, technically correct spoken answer.
- One especially challenging follow-up question with its answer.

---

# PART 3 — DEFEND BULLET 2: RELIABILITY

"Designed a 7-state execution machine with heartbeat-based crash detection and sandboxed workspaces, protecting agent execution against path traversal while allowing failed tasks to recover safely."

This is likely to attract challenging technical questions.

Teach me:

1. **Finite-state machine:** What is it, and why does Beav need one instead of ordinary status strings?

2. **Seven states:** Identify the exact seven states from the code. Explain what each represents and which transitions are allowed.

3. **State transitions:** What enforces valid transitions? What happens if a worker attempts an invalid transition?

4. **Heartbeats:** What exactly is a heartbeat? Who writes it, how frequently, where is it stored, and how does the system detect a stale or dead worker?

5. **Crash detection:** What happens if the worker crashes halfway through code generation? How does the system distinguish a crashed worker from a slow operation, if it does?

6. **Crash recovery:** Does the system retry, reset, resume, or fail the task? Explain the actual code behavior, including limits on recovery.

7. **Sandboxed workspaces:** What does a workspace contain? How are workspaces created and isolated?

8. **Path traversal:** Explain an attack such as `../../outside-folder`, why it is dangerous, and what exact validation Beav uses against it.

9. **Security boundaries:** Does the system provide true OS/container-level sandboxing or only workspace/path isolation? Be precise and never exaggerate its security guarantees.

Give me a simple state-machine diagram and one concrete crash-recovery example.

Finish with:
- A natural first-person explanation of Bullet 2 (30–45 seconds).
- The **four most likely interviewer follow-up questions** and strong answers.
- One challenging failure scenario and how I should respond.

---

# PART 4 — DEFEND BULLET 3: CONCURRENCY

"Enabled reliable parallel workers using SQLite WAL mode and atomic state transitions to reduce database contention and prevent inconsistent task lifecycle updates."

**Explain this particularly carefully. I want to understand the mechanisms, not memorize buzzwords.**

Start with a simple problem:

"Two workers discover the same pending GitHub issue at nearly the same time."

Then teach me:

1. What are workers, and how does Beav run multiple workers?
2. What is a race condition? Demonstrate the exact failure that could occur if two workers claimed the same task.
3. What is SQLite, and why was it chosen here?
4. What is SQLite WAL (Write-Ahead Logging)? Explain it with a simple example of readers and a writer.
5. What concurrency does WAL actually permit? Explicitly clarify that SQLite still has a single-writer constraint.
6. What is an atomic state transition?
7. How does Beav actually claim a task safely? Show the relevant SQL/Drizzle logic if it exists.
8. What is a conditional database update or compare-and-swap-style operation?
9. What happens if two workers race for the same task?
10. What happens when a worker crashes after claiming a task?
11. What is the difference between a transaction, atomicity, isolation, and locking?
12. What are the limitations of SQLite WAL when scaling to many processes or machines?
13. Why not use PostgreSQL, Redis, or a message queue for this system?

Use one **step-by-step timeline of two competing workers** to illustrate how the actual code prevents or handles duplicate execution.

Distinguish guarantees from best-effort handling, and verify each claim against the implementation.

Finish with:
- A natural first-person explanation of Bullet 3 (30–45 seconds).
- The **four most likely interviewer follow-up questions** and answers.
- One especially difficult concurrency question and its answer.

---

# PART 5 — RESTROWORKS-FOCUSED FUNDAMENTALS

Restroworks' job description prioritizes JavaScript, Node.js, Express, databases, REST APIs, debugging, performance, OOP, and DSA.

I will study general web development separately, so DO NOT teach the complete syllabus here.

Instead, explain only the fundamentals directly demonstrated by Beav that are likely to be questioned.

Prioritize:
- Node.js event loop and asynchronous I/O
- Promises and async/await
- Child processes and IPC
- JavaScript/TypeScript modules and interfaces
- SQL transactions and atomic updates
- Database locks and concurrency
- Process crashes and error handling
- Retry safety, idempotency, and resource cleanup
- Modular architecture and separation of concerns

For each important concept, provide:
- A simple explanation.
- Where Beav uses it.
- One potential interviewer question, answered briefly.

Do not introduce unrelated concepts merely to make this section longer.

---

# PART 6 — RUTHLESS INTERVIEW SIMULATION PREPARATION

Give me the **12 highest-probability technical questions** derived specifically from the wording of my three Beav bullets.

Assume the interviewer is a skeptical senior engineer who wants to determine whether I actually understand my project.

Include:
- Questions that begin broadly and drill into implementation.
- Questions that challenge design choices.
- Questions involving process failures and race conditions.
- Questions that expose superficial understanding.
- Questions asking what I would improve.

Rank the questions by likely importance for a MEAN Stack Developer interview.

For each question, provide a spoken answer in approximately 3–6 sentences.

Do not repeat long explanations from previous sections.

---

# PART 7 — LAST-MINUTE REVISION SHEET

End with a revision sheet that takes approximately 5 minutes to review.

Include:

1. My 60–90-second introduction.
2. The entire task lifecycle in one short arrow diagram.
3. Each resume bullet explained in three memorable points.
4. The exact seven state names.
5. The most important details of JSON-RPC, heartbeat recovery, WAL, and atomic task claiming.
6. The five most dangerous technical overclaims or mistakes to avoid.
7. The five questions I absolutely must be able to answer before entering the interview.

---

# IMPORTANT TEACHING INSTRUCTIONS

Assume I have a programming foundation but am not yet comfortable with systems engineering concepts.

For every complex concept, follow this order:

**Simple intuition → concrete Beav example → actual mechanism/code → why it matters → limitation.**

Use simple English, not jargon-heavy documentation.

If a term such as IPC, WAL, CAS, heartbeat, state transition, or sandbox is introduced, define it immediately.

Use code snippets only where understanding the code is important. Keep them short.

Reference actual repository file paths and function names so I can inspect them when necessary.

Do not spend time explaining unrelated packages, configuration files, or every function in the repository.

Do not claim that a mechanism is implemented merely because documentation mentions it. Verify it against the current source code.

If a bullet is misleading or only partially supported, clearly explain exactly what I should say instead.

**Do not ask me questions, modify source files, or turn this into an interactive session. Produce one complete final preparation guide.**

My next step is to bring your response to ChatGPT, where I will be taught the difficult parts and tested through a mock interview.

So optimize this guide to give me enough understanding to learn efficiently, not to make it look technically impressive.

**The final goal: I should be able to defend every word in these three resume bullets without getting lost when the interviewer asks "how exactly?" or "why?"**

## Assistant

I’ll check the current source and tests against each resume claim, then build the guide around the mechanisms you can defend and the limitations you should state clearly.

## Activity

    $ rg -n 'Beav|worker-event|WAL|heartbeat' /home/pranav/.codex/memories/MEMORY.md
    1:# Task Group: Beav GitHub issue-to-PR orchestration and interview walkthrough
    3:scope: Explaining, validating, or extending Beav's single-host TypeScript automation from labeled GitHub issue through worker/Codex integration, pull request, and merge verification; use for interview preparation grounded in implementation rather than README claims.
    4:applies_to: cwd=/home/pranav/projects/Beav; reuse_rule=Treat implementation facts as checkout-specific and re-inspect the active branch before applying them to another Beav revision or distributed deployment.
    6:## Task 1: Analyze Beav and create an interview-ready end-to-end walkthrough, completed
    10:- rollout_summaries/2026-10-14T14-01-20-FY0e-beav_interview_preparation_walkthrough.md (cwd=/home/pranav/projects/Beav, rollout_path=/home/pranav/.codex/sessions/2026/10/14/rollout-2026-10-14T14-01-20-01a13ab7-b545-7a30-bdf8-faf475bbff06.jsonl, updated_at=2026-10-14T14:06:56+00:00, thread_id=01a13ab7-b545-7a30-bdf8-faf475bbff06, source inspection and per-package compilation succeeded; worker-event tests expose stale fixtures)
    14:- Beav, TypeScript, pnpm monorepo, SQLite, Drizzle, WAL, Octokit, Codex app-server, JSON-RPC, Node IPC, state-machine, heartbeat, retryCount, PR verification, worker-events.test.mjs
    22:- Beav is a single-host TypeScript pnpm monorepo: `core` owns schema/config/state/workspaces; `tracker` GitHub issue/PR checks; `orchestrator` scheduling/dispatch/recovery; `worker` Codex integration and PR publication; `cli` startup commands. The lifecycle is labeled open GitHub issue via Octokit → SQLite task → conditional claim → shallow task clone → spawned worker/Node IPC → newline-delimited JSON-RPC with `codex app-server` → branch/commit/PR → poll checks and merge state. [Task 1]
    23:- States are `pending`, `claimed`, `running`, `verifying`, `done`, `failed`, `crashed`; retries return eligible failed/crashed work to `pending`. SQLite WAL plus unique `(repoOwner, repoName, githubIssueNumber)` and conditional `pending` claim prevent duplicate launches in the normal one-orchestrator case. [Task 1]
    24:- Defaults: concurrency 3; poll 30 seconds; stale threshold 45 seconds; workspace root `./workspaces`; issue label `autofix` via `ISSUE_TITLE`; heartbeat 15 seconds; worker timeout 10 minutes; retry delay `10_000 * 2 ** attempt`. `verifying` tasks still consume capacity. A merged PR deletes its row; successful checks await human merge. [Task 1]
    30:- Symptom: `node --test test/worker-events.test.mjs` has 1 passing and 2 failing cases. Cause: `failed` fixtures lack `retryCount`; `completed` fixtures lack `prNumber`/`prUrl`, so `isWorkerEvent` rejects them. Fix fixtures or contracts before claiming the suite passes. [Task 1]
    31:- Do not repeat README claims as verified behavior: `status`/`logs` are placeholders; verification failures do not currently retry; null-heartbeat stale tasks can remain stuck; late events can overwrite newer state; lifecycle writes are not universally guarded by the state machine. [Task 1]
    ✓ • 0ms

## Activity

    $ pwd && rg --files -g 'AGENTS.md' -g 'package.json' -g '*test*' -g '*schema*' -g '*state*' -g '*worker*' -g '*orchestr*' -g '*workspace*' -g '*rpc*' -g '*github*' -g '*codex*' -g '*db*' -g '*poll*' -g '*supervis*' -g '*config*' && git status --short && git branch --show-current
    /home/pranav/projects/Beav
    tsconfig.json
    package.json
    .codex
    packages/worker/tsconfig.json
    packages/worker/package.json
    packages/beav.db
    packages/core/tsconfig.json
    packages/core/package.json
    packages/core/src/workspace.ts
    packages/core/src/config.ts
    packages/core/src/schema.ts
    packages/core/src/worker-events.ts
    packages/core/src/db.ts
    packages/core/src/state-machine.ts
    packages/tracker/tsconfig.json
    packages/tracker/package.json
    packages/tracker/src/github.ts
    packages/beav.db-wal
    packages/beav.db-shm
    packages/orchestrator/tsconfig.json
    packages/orchestrator/package.json
    packages/orchestrator/src/worker-events.ts
    packages/orchestrator/src/worker-event-store.ts
    packages/orchestrator/test/worker-events.test.mjs
    packages/cli/tsconfig.json
    packages/cli/beav.db
    packages/cli/package.json
    packages/cli/beav.db-wal
    packages/cli/beav.db-shm
    pnpm-workspace.yaml
    main
    ✓ • 0ms

## Activity

    $ rg --files packages -g '!*.db*' -g '!node_modules' -g '!dist' && cat package.json && cat packages/{core,tracker,orchestrator,worker,cli}/package.json
    packages/worker/tsconfig.json
    packages/worker/package.json
    packages/worker/src/gitcommands.ts
    packages/worker/src/index.ts
    packages/core/Readme.txt
    packages/core/tsconfig.json
    packages/core/package.json
    packages/core/src/logger.ts
    packages/core/src/workspace.ts
    packages/core/src/types.ts
    packages/core/src/config.ts
    packages/core/src/schema.ts
    packages/core/src/worker-events.ts
    packages/core/src/db.ts
    packages/core/src/state-machine.ts
    packages/core/src/index.ts
    packages/tracker/tsconfig.json
    packages/tracker/package.json
    packages/tracker/src/github.ts
    packages/tracker/src/status.ts
    packages/tracker/src/index.ts
    packages/orchestrator/tsconfig.json
    packages/orchestrator/package.json
    packages/orchestrator/src/retries.ts
    packages/orchestrator/src/worker-events.ts
    packages/orchestrator/src/launcher.ts
    packages/orchestrator/src/tick.ts
    packages/orchestrator/src/worker-event-store.ts
    packages/orchestrator/src/index.ts
    packages/orchestrator/test/worker-events.test.mjs
    packages/cli/tsconfig.json
    packages/cli/fix_done.ts
    packages/cli/package.json
    packages/cli/src/setup.ts
    packages/cli/src/index.ts
    {
      "name": "beav",
      "version": "1.0.0",
      "private": true,
      "packageManager": "pnpm@10.33.0",
      "scripts": {
        "dev": "pnpm -F @beav/core dev",
        "dev:cli": "pnpm -F @beav/cli dev",
        "dev:tracker": "pnpm -F @beav/tracker dev",
        "dev:orchestrator": "pnpm -F @beav/orchestrator dev",
        "dev:worker": "pnpm -F @beav/worker dev",
        "format": "prettier --write .",
        "build": "pnpm -r build",
        "clean": "pnpm -r clean",
        "start": "pnpm -C packages/cli exec tsx src/index.ts start"
      },
      "devDependencies": {
        "@types/node": "^25.6.2",
        "prettier": "^3.8.1"
      }
    }
    {
      "name": "@beav/core",
      "version": "1.0.0",
      "type": "module",
      "main": "./dist/index.js",
      "types": "./dist/index.d.ts",
      "exports": {
        ".": {
          "types": "./dist/index.d.ts",
          "default": "./dist/index.js"
        },
        "./db": {
          "types": "./dist/db.d.ts",
          "default": "./dist/db.js"
        },
        "./schema": {
          "types": "./dist/schema.d.ts",
          "default": "./dist/schema.js"
        },
        "./worker-events": {
          "types": "./dist/worker-events.d.ts",
          "default": "./dist/worker-events.js"
        }
      },
      "scripts": {
        "dev": "tsx src/index.ts",
        "build": "tsc",
        "clean": "rm -rf dist"
      },
      "devDependencies": {
        "tsx": "^4.21.0",
        "typescript": "^6.0.2"
      },
      "dependencies": {
        "@types/better-sqlite3": "^7.6.13",
        "better-sqlite3": "^12.8.0",
        "dotenv": "^17.4.0",
        "drizzle-orm": "^0.45.2",
        "zod": "^4.3.6"
      }
    }
    {
      "name": "@beav/tracker",
      "version": "1.0.0",
      "type": "module",
      "main": "./dist/index.js",
      "types": "./dist/index.d.ts",
      "exports": {
        ".": {
          "types": "./dist/index.d.ts",
          "default": "./dist/index.js"
        }
      },
      "scripts": {
        "dev": "tsx src/index.ts",
        "build": "tsc",
        "clean": "rm -rf dist"
      },
      "devDependencies": {
        "@types/node": "^25.5.2",
        "tsx": "^4.21.0",
        "typescript": "^6.0.2"
      },
      "dependencies": {
        "@beav/core": "workspace:*",
        "@octokit/rest": "^22.0.1",
        "dotenv": "^17.4.0",
        "ulid": "^3.0.2",
        "zod": "^4.3.6"
      }
    }
    {
      "name": "@beav/orchestrator",
      "version": "1.0.0",
      "type": "module",
      "main": "./dist/index.js",
      "types": "./dist/index.d.ts",
      "exports": {
        ".": {
          "types": "./dist/index.d.ts",
          "default": "./dist/index.js"
        }
      },
      "scripts": {
        "dev": "tsx src/index.ts",
        "build": "tsc",
        "test": "node --test test/worker-events.test.mjs",
        "clean": "rm -rf dist"
      },
      "devDependencies": {
        "tsx": "^4.21.0",
        "typescript": "^6.0.2"
      },
      "dependencies": {
        "@beav/core": "workspace:*",
        "@beav/tracker": "workspace:*",
        "drizzle-orm": "^0.45.2",
        "zod": "^4.3.6"
      }
    }
    {
      "name": "@beav/worker",
      "version": "1.0.0",
      "type": "module",
      "main": "./dist/index.js",
      "types": "./dist/index.d.ts",
      "exports": {
        ".": {
          "types": "./dist/index.d.ts",
          "default": "./dist/index.js"
        }
      },
      "scripts": {
        "dev": "tsx src/index.ts",
        "build": "tsc",
        "clean": "rm -rf dist"
      },
      "devDependencies": {
        "tsx": "^4.21.0",
        "typescript": "^6.0.2"
      },
      "dependencies": {
        "@beav/core": "workspace:*"
      }
    }
    {
      "name": "@beav/cli",
      "version": "1.0.0",
      "private": true,
      "type": "module",
      "bin": {
        "beav": "./dist/index.js"
      },
      "main": "./dist/index.js",
      "types": "./dist/index.d.ts",
      "exports": {
        ".": {
          "types": "./dist/index.d.ts",
          "default": "./dist/index.js"
        }
      },
      "scripts": {
        "dev": "tsx src/index.ts",
        "build": "tsc",
        "clean": "rm -rf dist"
      },
      "devDependencies": {
        "@types/node": "^20.0.0",
        "tsx": "^4.21.0",
        "typescript": "^6.0.2"
      },
      "dependencies": {
        "@beav/core": "workspace:*",
        "@beav/orchestrator": "workspace:*"
      }
    }
    ✓ • 0ms

## Activity

    $ sed -n '1,65p' /home/pranav/.codex/memories/MEMORY.md && cat /home/pranav/.codex/memories/rollout_summaries/2026-10-14T14-01-20-FY0e-beav_interview_preparation_walkthrough.md
    # Task Group: Beav GitHub issue-to-PR orchestration and interview walkthrough
    
    scope: Explaining, validating, or extending Beav's single-host TypeScript automation from labeled GitHub issue through worker/Codex integration, pull request, and merge verification; use for interview preparation grounded in implementation rather than README claims.
    applies_to: cwd=/home/pranav/projects/Beav; reuse_rule=Treat implementation facts as checkout-specific and re-inspect the active branch before applying them to another Beav revision or distributed deployment.
    
    ## Task 1: Analyze Beav and create an interview-ready end-to-end walkthrough, completed
    
    ### rollout_summary_files
    
    - rollout_summaries/2026-10-14T14-01-20-FY0e-beav_interview_preparation_walkthrough.md (cwd=/home/pranav/projects/Beav, rollout_path=/home/pranav/.codex/sessions/2026/10/14/rollout-2026-10-14T14-01-20-01a13ab7-b545-7a30-bdf8-faf475bbff06.jsonl, updated_at=2026-10-14T14:06:56+00:00, thread_id=01a13ab7-b545-7a30-bdf8-faf475bbff06, source inspection and per-package compilation succeeded; worker-event tests expose stale fixtures)
    
    ### keywords
    
    - Beav, TypeScript, pnpm monorepo, SQLite, Drizzle, WAL, Octokit, Codex app-server, JSON-RPC, Node IPC, state-machine, heartbeat, retryCount, PR verification, worker-events.test.mjs
    
    ## User preferences
    
    - When preparing for an interview, the user asked for a “walkthrough perfect for interview preparation” -> explain the complete lifecycle, defend design choices, anticipate follow-ups, and distinguish implemented guarantees from aspirational README claims. [Task 1]
    
    ## Reusable knowledge
    
    - Beav is a single-host TypeScript pnpm monorepo: `core` owns schema/config/state/workspaces; `tracker` GitHub issue/PR checks; `orchestrator` scheduling/dispatch/recovery; `worker` Codex integration and PR publication; `cli` startup commands. The lifecycle is labeled open GitHub issue via Octokit → SQLite task → conditional claim → shallow task clone → spawned worker/Node IPC → newline-delimited JSON-RPC with `codex app-server` → branch/commit/PR → poll checks and merge state. [Task 1]
    - States are `pending`, `claimed`, `running`, `verifying`, `done`, `failed`, `crashed`; retries return eligible failed/crashed work to `pending`. SQLite WAL plus unique `(repoOwner, repoName, githubIssueNumber)` and conditional `pending` claim prevent duplicate launches in the normal one-orchestrator case. [Task 1]
    - Defaults: concurrency 3; poll 30 seconds; stale threshold 45 seconds; workspace root `./workspaces`; issue label `autofix` via `ISSUE_TITLE`; heartbeat 15 seconds; worker timeout 10 minutes; retry delay `10_000 * 2 ** attempt`. `verifying` tasks still consume capacity. A merged PR deletes its row; successful checks await human merge. [Task 1]
    - Task-specific clones isolate processes but are not a security boundary: Codex receives `danger-full-access`. The implementation is not multi-host coordination, exactly-once execution, automatic merge, or a guaranteed local test gate. [Task 1]
    
    ## Failures and how to do differently
    
    - Symptom: root `pnpm build` is unavailable (`pnpm: command not found`). Fix: compile each package with its installed `./node_modules/.bin/tsc -p tsconfig.json`, and report compile evidence separately from test status. [Task 1]
    - Symptom: `node --test test/worker-events.test.mjs` has 1 passing and 2 failing cases. Cause: `failed` fixtures lack `retryCount`; `completed` fixtures lack `prNumber`/`prUrl`, so `isWorkerEvent` rejects them. Fix fixtures or contracts before claiming the suite passes. [Task 1]
    - Do not repeat README claims as verified behavior: `status`/`logs` are placeholders; verification failures do not currently retry; null-heartbeat stale tasks can remain stuck; late events can overwrite newer state; lifecycle writes are not universally guarded by the state machine. [Task 1]
    
    # Task Group: ByteLearn staged RAG architecture, conversational SSE API, chat lifecycle, and interview defense
    
    scope: Implementing, extending, documenting, or defending ByteLearn Stage 1/3/4 RAG work: LangChain/Gemini answer boundary, LangGraph state/runtime, anonymous SSE API, cancellation/privacy, `VideoChatBody` lifecycle, and source-grounded interview claims.
    applies_to: cwd=/home/pranav/projects/ByteLearn; reuse_rule=Reuse contracts only after inspecting active branch/status. Scope historical claims to named commits; later working-tree persistence changes are not Stage 4 evidence.
    
    ## Task 1: Implement and verify the Stage 3 in-memory conversational RAG graph; evidence scoped to commit `a187a4c`
    
    ### rollout_summary_files
    
    - rollout_summaries/2026-09-22T20-11-13-UB4R-stage_3_conversational_rag_graph_evidence.md (cwd=/home/pranav/projects/ByteLearn, rollout_path=/home/pranav/.codex/sessions/2026/09/22/rollout-2026-09-22T20-11-13-01a0cabe-7134-74e1-8443-4cd76290e1f1.jsonl, updated_at=2026-09-23T21:30:18+00:00, thread_id=01a0cabe-7134-74e1-8443-4cd76290e1f1, verified; historical evidence scoped to `6d42d0c..a187a4c`)
    
    ### keywords
    
    - Stage 3, a187a4c, 6d42d0c, conversationalRagGraph.js, conversationalRagRuntime.js, @langchain/langgraph@1.4.13, MemorySaver, messagesStateReducer, retrieveHybridTranscriptChunks, streamGroundedAnswerText, validateGroundedCitations, RunTree, git diff --check
    
    ## Task 2: Produce Stage 3 implementation evidence packet from commit `a187a4c`, completed
    
    ### rollout_summary_files
    
    - rollout_summaries/2026-09-22T20-11-13-UB4R-stage_3_conversational_rag_graph_evidence.md (cwd=/home/pranav/projects/ByteLearn, rollout_path=/home/pranav/.codex/sessions/2026/09/22/rollout-2026-09-22T20-11-13-01a0cabe-7134-74e1-8443-4cd76290e1f1.jsonl, updated_at=2026-09-23T21:30:18+00:00, thread_id=01a0cabe-7134-74e1-8443-4cd76290e1f1, factual/interview evidence; excludes later Stage 4 work)
    
    ### keywords
    
    - Stage 3, a187a4c, 6d42d0c, Stage 2 echo graph, citation-ID filtering, MemorySaver, public controller, interview evidence
    
    ## Task 3: Produce Stage 4 public SSE API and React chat integration evidence from committed diff, completed
    
    ### rollout_summary_files
    
    - rollout_summaries/2026-09-22T22-30-07-CtUw-stage4_implementation_evidence_packet.md (cwd=/home/pranav/projects/ByteLearn, rollout_path=/home/pranav/.codex/sessions/2026/09/22/rollout-2026-09-22T22-30-07-01a0cb3d-9b45-7362-b7ba-ffccde7e21b4.jsonl, updated_at=2026-09-23T21:30:19+00:00, thread_id=01a0cb3d-9b45-7362-b7ba-ffccde7e21b4, read-only evidence scoped to `a187a4c..08b9ca9`)
    
    ### keywords
    
    thread_id: 01a13ab7-b545-7a30-bdf8-faf475bbff06
    updated_at: 2026-10-14T14:06:56+00:00
    rollout_path: /home/pranav/.codex/sessions/2026/10/14/rollout-2026-10-14T14-01-20-01a13ab7-b545-7a30-bdf8-faf475bbff06.jsonl
    cwd: /home/pranav/projects/Beav
    git_branch: main
    
    # Interview-preparation walkthrough for Beav
    
    Rollout context: The user wanted to recover an old project’s architecture and understand it well enough to defend it in interviews. The repository is `/home/pranav/projects/Beav`, a TypeScript pnpm monorepo.
    
    ## Task 1: Analyze Beav and create an interview-ready walkthrough
    
    Outcome: success
    
    Preference signals:
    
    - The user asked for a “walkthrough perfect for interview preparation,” indicating that future explanations should prioritize a coherent end-to-end story, design tradeoffs, likely interviewer follow-ups, and honest discussion of limitations rather than merely summarizing files.
    
    Key steps:
    
    - Inspected the monorepo structure, README, package manifests, core state/schema/configuration, orchestrator, worker, tracker, CLI, tests, and example logs.
    - Reconstructed the issue lifecycle: labeled GitHub issue → SQLite task → conditional claim → isolated clone → worker process → Codex app-server JSON-RPC → commit/PR → CI/merge verification.
    - Distinguished the two communication channels: Node IPC between orchestrator and worker, and newline-delimited JSON over stdin/stdout between worker and Codex.
    - Identified the five package responsibilities: `core`, `tracker`, `orchestrator`, `worker`, and `cli`.
    - Verified that all five packages compile using each package’s installed TypeScript compiler.
    - Ran the existing orchestrator worker-event tests: one passed and two failed because fixtures no longer satisfy the current event contract.
    
    Failures and how to do differently:
    
    - `pnpm build` could not run because `pnpm` was unavailable in the shell. Per-package `tsc` commands succeeded instead.
    - Worker-event tests failed because failure fixtures omitted `retryCount` and completion fixtures omitted `prNumber`/`prUrl`; validation rejected those events before persistence. Future explanations should clearly separate compilation success from test-suite failure.
    - The README overstates some behavior. The implementation does not provide multi-host coordination, automatic merging, a guaranteed local test gate, fully functional CLI `status`/`logs`, or universal retry handling for verification failures.
    
    Reusable knowledge:
    
    - Main task states: `pending → claimed → running → verifying → done/failed/crashed`; retries return `failed`/`crashed` to `pending`.
    - Defaults: max concurrency 3, polling every 30 seconds, stale heartbeat threshold 45 seconds, workspace root `./workspaces`, issue label supplied through `ISSUE_TITLE` and defaulting to `autofix`.
    - Workers emit heartbeats every 15 seconds; worker timeout is 10 minutes; retry delay is `10_000 * 2 ** attempt` milliseconds.
    - SQLite runs in WAL mode and deduplicates by `(repoOwner, repoName, githubIssueNumber)`. Conditional `pending → claimed` updates prevent two claimers from launching the same task in the normal single-host case.
    - Each task gets a shallow Git clone under a validated task-specific workspace. This is workspace/process separation, not a security sandbox; Codex is launched with `danger-full-access`.
    - The worker uses request-ID promise tracking for Codex RPC, responds to server approval requests, streams logs, sends structured events, creates a `beav-fix-<taskId>` branch, pushes it, and creates or reuses a PR.
    - Verification treats a merged PR as success and deletes the task row; closed-unmerged or failed checks mark it failed. Open PRs and successful checks remain `verifying` until merge, so review tasks consume concurrency slots.
    - Important limitations to mention in interviews: stale detection ignores null heartbeats, late events can overwrite newer state, task history is deleted on merge, separate clones do not prevent merge conflicts, and the system is single-host rather than a true distributed deployment.
    
    References:
    
    - `/home/pranav/projects/Beav/packages/core/src/schema.ts` — persistent task and log schema.
    - `/home/pranav/projects/Beav/packages/core/src/state-machine.ts` — declared lifecycle transitions.
    - `/home/pranav/projects/Beav/packages/orchestrator/src/tick.ts` — recovery, retries, capacity, claiming, dispatch, and verification loop.
    - `/home/pranav/projects/Beav/packages/orchestrator/src/launcher.ts` — worker process spawning and IPC.
    - `/home/pranav/projects/Beav/packages/worker/src/index.ts` — Codex app-server protocol, heartbeats, timeout, cleanup, and events.
    - `/home/pranav/projects/Beav/packages/worker/src/gitcommands.ts` — branch, commit, push, and PR creation.
    - `/home/pranav/projects/Beav/packages/tracker/src/github.ts` — GitHub issue ingestion and PR/check verification.
    - Validation evidence: per-package `tsc` exited 0 for `core`, `tracker`, `orchestrator`, `worker`, and `cli`; worker-event tests reported 1 passing and 2 failing cases.
    ✓ • 0ms

## Activity

    $ rg --files -g 'AGENTS.md' /home/pranav/projects /home/pranav/.codex 2>/dev/null
    /home/pranav/projects/ByteLearn/Frontend/AGENTS.md
    ✓ • 0ms

## Activity

    $ cat packages/core/src/{schema,db,state-machine,workspace,config,worker-events}.ts
    import { sqliteTable, integer, text, uniqueIndex, index } from "drizzle-orm/sqlite-core"
    
    export const tasks = sqliteTable("tasks", {
        //ULID
        id: text("id").primaryKey(),
    
        //Github link
        githubIssueId: integer("githubIssueId").notNull(),
        githubIssueNumber: integer("githubIssueNumber").notNull(),
        htmlUrl: text("html_url").notNull(),
        repoOwner: text("repoOwner").notNull(),
        repoName: text("repoName").notNull(),
        issueTitle: text("issueTitle").notNull(),
        body: text("body"),
    
        //State Machine
        status: text("status", { enum: ["pending", "claimed", "running", "done", "verifying", "failed", "crashed"] }).notNull().default("pending"),
    
        //Resiliance
        retryCount: integer("retryCount").default(0),
        maxRetries: integer("max_retries").default(3),
    
        //Execution Data
        workspacePath: text("workspacePath"),
        workerPid: integer("workerPid"),
    
        //codex server pid
        threadId: text("threadId"),
        turnId: text("turnId"),
    
        //PR check data
        prURL: text("prURL"),
        prNumber: integer("prNumber"),
        commitSha: text("commitSha"),
    
        //Timestamps
        lastHeartbeat: integer("lastHeartbeat"),
        claimedAt: integer("claimedAt"),
        nextRetryAt: integer("nextRetryAt"),
        startedAt: integer("startedAt"),
        completedAt: integer("completedAt"),
        createdAt: integer("createdAt")
    }, (table) => ({
        statusIdx: index("tasks_status_idx").on(table.status),
        uniqueRepoIssue: uniqueIndex("uniqueRepoIssue").on(
          table.repoOwner,
          table.repoName,
          table.githubIssueNumber
        ),
    }));
    
    export const taskLogs = sqliteTable("taskLogs", {
        id: integer("id").primaryKey({ autoIncrement: true }),
        taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
        stream: text("stream", { enum: ["stdout", "stderr", "system"] }).notNull(),
        line: text("line").notNull(),
        ts: integer("ts")
    });
    import * as schema from './schema.js';
    import { drizzle } from 'drizzle-orm/better-sqlite3';
    import Database from 'better-sqlite3';
    
    // create beav.db file in root
    const sqlite = new Database('beav.db');
    sqlite.exec('PRAGMA journal_mode = WAL;');
    sqlite.exec('PRAGMA foreign_keys = ON;');
    
    // Auto-create tables on first run (schema push)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        githubIssueId INTEGER NOT NULL,
        githubIssueNumber INTEGER NOT NULL,
        html_url TEXT NOT NULL,
        repoOwner TEXT NOT NULL,
        repoName TEXT NOT NULL,
        issueTitle TEXT NOT NULL,
        body TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        retryCount INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        workspacePath TEXT,
        workerPid INTEGER,
        threadId TEXT,
        turnId TEXT,
        prURL TEXT,
        prNumber INTEGER,
        commitSha TEXT,
        lastHeartbeat INTEGER,
        claimedAt INTEGER,
        nextRetryAt INTEGER,
        startedAt INTEGER,
        completedAt INTEGER,
        createdAt INTEGER,
        UNIQUE (repoOwner, repoName, githubIssueNumber)
      );
    `);
    
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS taskLogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        stream TEXT NOT NULL,
        line TEXT NOT NULL,
        ts INTEGER
      );
    `);
    
    sqlite.exec('CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);');
    
    export const db = drizzle(sqlite, { schema });
    import { type TaskStatus } from "./types.js";
    
    /*
    Why Class: Class have Memory, Encapsulation (Black Box), Multiple tasks(multiple instances)
    */
    export class TaskStateMachine{
        private currentStatus:  TaskStatus;
    
        constructor(initialStatus: TaskStatus = "pending") {
            this.currentStatus = initialStatus;
        }
    
        // Allowed Moves map
        private transitions: Record<TaskStatus, TaskStatus[]> = {
            pending: ["claimed"],
            claimed: ["running", "crashed"],
            running: ["verifying", "failed", "crashed"],
            verifying: ["done", "failed"],
            done: [], // Terminal state
            failed: ["pending"], // Can be retried
            crashed: ["pending"], // Can be retried
        };
    
        // action
        transitionTo(next: TaskStatus) {
            const allowed = this.transitions[this.currentStatus];
    
            if (!allowed.includes(next)) {
              throw new Error(
                `Invalid Transition: Cannot move from ${this.currentStatus} to ${next}`
              );
            }
    
            this.currentStatus = next;
            return this.currentStatus;
        }
    
        // Helper to get Current Status
        getStatus() {
            return this.currentStatus;
          }
    }import path from "node:path";
    import fs from "node:fs/promises";
    import { spawn } from "node:child_process";
    import * as logger from "./logger.js";
    
    export async function setupWorkspace(
      taskId: string,
      repoOwner: string,
      repoName: string,
      workspaceRoot: string)
    {
      const rootDir = path.resolve(workspaceRoot);
      const targetDir = path.resolve(rootDir, taskId);
    
      const relativeTarget = path.relative(rootDir, targetDir);
      if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
        throw new Error(`SECURITY BREACH: Path traversal detected for ID ${taskId}`);
      }
    
      const tag = `workspace:${taskId.slice(-8)}`;
      logger.info(tag, `Creating directory: ${targetDir}`);
      await fs.rm(targetDir, { recursive: true, force: true });
      await fs.mkdir(targetDir, { recursive: true });
    
      const repoCloneUrl = `https://github.com/${repoOwner}/${repoName}.git`;
      logger.info(tag, `Cloning ${repoOwner}/${repoName}...`);
      try {
        await new Promise<void>((resolve, reject) => {
          const proc = spawn('git', ['clone', '--depth', '1', repoCloneUrl, '.'], {
            cwd: targetDir,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          let stderr = '';
    
          proc.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
          });
          proc.on('error', reject);
          proc.on('close', (code) => {
            if (code === 0) {
              resolve();
              return;
            }
    
            reject(new Error(stderr || `git clone failed with exit code ${code}`));
          });
        });
        logger.info(tag, `Clone complete`);
      } catch (err) {
        throw new Error(`Git clone failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    
      return targetDir;
    }
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
    export type WorkerEvent =
       {
          type: 'heartbeat';
          taskId: string;
          ts: number;
        }
      | {
          type: 'log';
          taskId: string;
          stream: 'system';
          line: string;
          ts: number;
        }
      | {
          type: 'thread-state';
          taskId: string;
          threadId: string;
          turnId: string;
        }
      | {
          type: 'failed';
          taskId: string;
          error: string;
          ts: number;
          retryCount: number;
        }
      | {
          type: 'completed';
          taskId: string;
          completedAt: number;
          prNumber: number;
          prUrl: string;
        };
    
    export function isWorkerEvent(value: unknown): value is WorkerEvent {
      if (!value || typeof value !== 'object') {
        return false;
      }
    
      const event = value as Partial<WorkerEvent> & { type?: string };
    
      switch (event.type) {
        case 'heartbeat':
          return (
            typeof event.taskId === 'string' &&
            typeof event.ts === 'number'
          );
        case 'log':
          return (
            typeof event.taskId === 'string' &&
            event.stream === 'system' &&
            typeof event.line === 'string' &&
            typeof event.ts === 'number'
          );
        case 'thread-state':
          return (
            typeof event.taskId === 'string' &&
            typeof event.threadId === 'string' &&
            typeof event.turnId === 'string'
          );
        case 'failed':
          return (
            typeof event.taskId === 'string' &&
            typeof event.error === 'string' &&
            typeof event.ts === 'number' &&
            typeof event.retryCount === 'number'
          );
        case 'completed':
          return (
            typeof event.taskId === 'string' &&
            typeof event.completedAt === 'number' &&
            typeof event.prNumber === 'number' &&
            typeof event.prUrl === 'string'
          );
        default:
          return false;
      }
    }
    ✓ • 0ms

## Activity

    $ cat packages/orchestrator/src/{index,tick,launcher,retries,worker-events,worker-event-store}.ts
    export * from "./launcher.js";
    export * from "./retries.js";
    export * from "./tick.js";
    
    import { stopActiveWorkers } from "./launcher.js";
    import { recoverOnStartup, tick } from "./tick.js";
    import { logger } from "@beav/core";
    import type { Workflow } from "@beav/core";
    
    export async function start(workflow?: Workflow) {
        const { loadConfig } = await import("@beav/core");
        const activeWorkflow = workflow ?? loadConfig();
    
        logger.info('orchestrator', `Starting with repo ${activeWorkflow.repoOwner}/${activeWorkflow.repoName}`);
        logger.info('orchestrator', `Poll interval: ${activeWorkflow.pollIntervalMs}ms, Max concurrent: ${activeWorkflow.maxConcurrent}`);
    
        let tickInProgress = false;
        let shuttingDown = false;
        let timer: NodeJS.Timeout | null = null;
    
        const shutdown = async (reason: string, exitCode = 0) => {
          if (shuttingDown) {
            return;
          }
    
          shuttingDown = true;
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
    
          logger.info('orchestrator', `Shutting down: ${reason}`);
          await stopActiveWorkers();
          logger.info('orchestrator', 'All workers stopped');
          process.exitCode = exitCode;
        };
    
        const runTick = async (failHard = false) => {
          if (tickInProgress || shuttingDown) {
            if (tickInProgress) {
              logger.info('orchestrator', 'Skipping tick: previous run still active');
            }
            return;
          }
    
          tickInProgress = true;
          try {
            await tick(activeWorkflow);
          } catch (error) {
            logger.error('orchestrator', 'Fatal tick failure', error);
            await shutdown('Stopping after fatal tick failure.', 1);
            if (failHard) {
              throw error;
            }
          } finally {
            tickInProgress = false;
          }
        };
    
        const handleSignal = (signal: NodeJS.Signals) => {
          void shutdown(`Received ${signal}. Stopping active workers.`).finally(() => {
            process.exit();
          });
        };
    
        process.once('SIGINT', handleSignal);
        process.once('SIGTERM', handleSignal);
    
        logger.info('orchestrator', 'Recovering stale tasks from previous run...');
        await recoverOnStartup();
    
        logger.info('orchestrator', 'Running first tick...');
        await runTick(true);
    
        logger.info('orchestrator', `Scheduler active — tick every ${activeWorkflow.pollIntervalMs}ms`);
        timer = setInterval(() => {
          void runTick();
        }, activeWorkflow.pollIntervalMs);
    }
    import {
      db,
      sql,
      tasks,
      TaskStateMachine,
      eq,
      and,
      lt,
      inArray,
      setupWorkspace,
      logger,
      type Task,
    } from '@beav/core';
    import fs from 'node:fs/promises';
    import { type Workflow } from '@beav/core';
    import { fetchIssue } from '@beav/tracker';
    import { computeRetryDelayMs } from './retries.js';
    import { launchTaskProcess } from './launcher.js';
    import { checkVerifyingTasks } from '@beav/tracker';
    
    export async function recoverOnStartup() {
      const recovered = await db
        .select()
        .from(tasks)
        .where(inArray(tasks.status, ['claimed', 'running']));
    
      if (recovered.length === 0) {
        logger.info('boot', 'No stale tasks to recover');
        return;
      }
    
      const workspacesToRemove: string[] = [];
    
      for (const task of recovered) {
        logger.info('boot', `Recovering stale task ${task.id} (${task.status})`);
        const sm = new TaskStateMachine(task.status);
        const next = sm.transitionTo('crashed');
        const retryCount = (task.retryCount ?? 0) + 1;
        const maxRetries = task.maxRetries ?? 0;
        const nextRetryAt =
          retryCount >= maxRetries
            ? null
            : Date.now() + computeRetryDelayMs(retryCount);
    
        await db
          .update(tasks)
          .set({
            status: next,
            retryCount,
            nextRetryAt,
            workerPid: null,
            workspacePath: null,
            threadId: null,
            turnId: null,
            startedAt: null,
            claimedAt: null,
            lastHeartbeat: null,
          })
          .where(eq(tasks.id, task.id));
    
        if (task.workspacePath) {
          workspacesToRemove.push(task.workspacePath);
        }
      }
    
      logger.info('boot', `Recovered ${recovered.length} stale tasks → crashed`);
    
      for (const workspacePath of workspacesToRemove) {
        await fs.rm(workspacePath, { recursive: true, force: true });
      }
    }
    
    async function killTask(taskId: string, pid: number) {
      try {
        process.kill(pid, 'SIGKILL');
        logger.info('deadlock', `Killed stale process ${pid} for task ${taskId}`);
      } catch (error: any) {
        if (error.code === 'ESRCH') {
          logger.info('deadlock', `Process ${pid} for task ${taskId} already dead`);
        } else {
          logger.error('deadlock', `Failed to kill process ${pid} for task ${taskId}`, error.message);
        }
      }
    }
    
    async function checkDeadTasksandUpdate(threshold: number) {
      const runningTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.status, 'running'));
    
      if (runningTasks.length === 0) return;
    
      let staleCount = 0;
      let failedCount = 0;
    
      for (const task of runningTasks) {
        if (task.lastHeartbeat != null && task.lastHeartbeat < threshold) {
          const pid = task.workerPid;
          if (pid) {
            await killTask(task.id, pid);
          }
    
          const sm = new TaskStateMachine(task.status);
          const retryCount = (task.retryCount ?? 0) + 1;
          const maxRetries = task.maxRetries ?? 0;
    
          if (retryCount >= maxRetries) {
            try {
              const next = sm.transitionTo('failed');
              await db
                .update(tasks)
                .set({
                  status: next,
                  retryCount,
                  nextRetryAt: null,
                  workerPid: null,
                  workspacePath: null,
                  threadId: null,
                  turnId: null,
                  startedAt: null,
                  claimedAt: null,
                  lastHeartbeat: null,
                })
                .where(eq(tasks.id, task.id));
    
              failedCount++;
              logger.error('deadlock', `Task ${task.id} exceeded max retries (${maxRetries}) → failed`);
            } catch {
              logger.error('deadlock', `Failed to mark task ${task.id} as failed`);
            }
          } else {
            try {
              const next = sm.transitionTo('crashed');
              await db
                .update(tasks)
                .set({
                  status: next,
                  retryCount,
                  nextRetryAt: Date.now() + computeRetryDelayMs(retryCount),
                  workerPid: null,
                  workspacePath: null,
                  threadId: null,
                  turnId: null,
                  startedAt: null,
                  claimedAt: null,
                  lastHeartbeat: null,
                })
                .where(eq(tasks.id, task.id));
    
              staleCount++;
              logger.info('deadlock', `Task ${task.id} stale → crashed (retry ${retryCount}/${maxRetries})`);
            } catch {
              logger.error('deadlock', `Invalid transition for task ${task.id}`);
            }
          }
        }
      }
    
      if (staleCount > 0 || failedCount > 0) {
        logger.info('deadlock', `Deadlock check: ${staleCount} crashed, ${failedCount} failed out of ${runningTasks.length} running`);
      }
    }
    
    async function requeueRetryableTasks(now: number) {
      const retryableTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            inArray(tasks.status, ['crashed', 'failed']),
            lt(tasks.nextRetryAt, now),
            sql`${tasks.retryCount} < ${tasks.maxRetries}`,
          ),
        );
    
      if (retryableTasks.length === 0) return;
    
      let requeuedCount = 0;
      const workspacesToRemove: string[] = [];
    
      for (const task of retryableTasks) {
        try {
          const sm = new TaskStateMachine(task.status);
          const next = sm.transitionTo('pending');
          await db
            .update(tasks)
            .set({
              status: next,
              nextRetryAt: null,
              claimedAt: null,
              startedAt: null,
              workerPid: null,
              lastHeartbeat: null,
              workspacePath: null,
              threadId: null,
              turnId: null,
            })
            .where(eq(tasks.id, task.id));
    
          requeuedCount++;
          logger.info('retry', `Requeued task ${task.id} (${task.status} → pending)`);
    
          if (task.workspacePath) {
            workspacesToRemove.push(task.workspacePath);
          }
        } catch {
          logger.error('retry', `Failed to requeue task ${task.id}`);
        }
      }
    
      for (const workspacePath of workspacesToRemove) {
        await fs.rm(workspacePath, { recursive: true, force: true });
      }
    }
    
    async function fetchCandidateIssue(config: Workflow) {
      logger.info('tracker', `Fetching issues from ${config.repoOwner}/${config.repoName} with label "${config.issueTitle}"`);
    
      const fetchIssueResponse = await fetchIssue(
        config.repoOwner,
        config.repoName,
        config.issueTitle,
        config.ghToken,
      );
    
      if (fetchIssueResponse.added > 0) {
        logger.info('tracker', `Added ${fetchIssueResponse.added} new issue(s) to queue`);
      }
    
      if (fetchIssueResponse.skipped > 0) {
        logger.warn('tracker', `Skipped ${fetchIssueResponse.skipped} issue(s)`);
      }
    
      for (const err of fetchIssueResponse.errors) {
        const detail =
          (err as any).type === 'VALIDATION_ERROR'
            ? `Validation failed for issue #${(err as any).issueNumber}`
            : (err as any).type === 'FETCH_ERROR'
              ? `GitHub API error: ${(err as any).message}`
              : `Database error: ${(err as any).message}`;
        logger.error('tracker', detail);
      }
    
      return fetchIssueResponse;
    }
    
    async function dispatchTasks(config: Workflow) {
      const activeCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(sql`${tasks.status} IN ('running', 'claimed', 'verifying')`);
    
      const active = activeCount[0]?.count ?? 0;
      const availableSlot = config.maxConcurrent - active;
    
      if (availableSlot <= 0) {
        logger.info('dispatch', `At capacity: ${active}/${config.maxConcurrent} workers active`);
        return;
      }
    
      const candidates = await db
        .select()
        .from(tasks)
        .where(eq(tasks.status, 'pending'))
        .orderBy(tasks.createdAt)
        .limit(availableSlot);
    
      if (candidates.length === 0) {
        logger.info('dispatch', 'No pending tasks to dispatch');
        return;
      }
    
      logger.info('dispatch', `Claiming ${candidates.length} task(s) for dispatch (${active}/${config.maxConcurrent} active)`);
    
      const taskToLaunch: Task[] = [];
    
      for (const task of candidates) {
        const sm = new TaskStateMachine(task.status);
        const nextStatus = sm.transitionTo('claimed');
    
        const updatedTask = await db
          .update(tasks)
          .set({ status: nextStatus, claimedAt: Date.now() })
          .where(and(eq(tasks.id, task.id), eq(tasks.status, 'pending')))
          .returning();
    
        const claimedTask = updatedTask[0];
        if (!claimedTask) {
          continue;
        }
    
        taskToLaunch.push(claimedTask);
        logger.info('dispatch', `Claimed task ${task.id} (${task.issueTitle})`);
      }
    
      for (const task of taskToLaunch) {
        try {
          logger.info('dispatch', `Setting up workspace for task ${task.id}...`);
    
          const workspacePath = await setupWorkspace(
            task.id,
            task.repoOwner,
            task.repoName,
            config.workspaceRoot,
          );
    
          await db
            .update(tasks)
            .set({ workspacePath })
            .where(eq(tasks.id, task.id));
    
          const workerPid = await launchTaskProcess({
            ...task,
            workspacePath,
          });
    
          logger.info('dispatch', `Launched task ${task.id} → worker PID ${workerPid}`);
        } catch (error) {
          logger.error('dispatch', `Failed to launch task ${task.id}`, error);
    
          const retryCount = (task.retryCount ?? 0) + 1;
          const maxRetries = task.maxRetries ?? 0;
          const nextStatus = new TaskStateMachine('claimed').transitionTo('crashed');
    
          await db
            .update(tasks)
            .set({
              status: nextStatus,
              retryCount,
              nextRetryAt:
                retryCount >= maxRetries
                  ? null
                  : Date.now() + computeRetryDelayMs(retryCount),
              workerPid: null,
              workspacePath: null,
              claimedAt: null,
              startedAt: null,
              lastHeartbeat: null,
            })
            .where(eq(tasks.id, task.id));
        }
      }
    }
    
    async function VerifyTasks(config: Workflow) {
      await checkVerifyingTasks(config);
    }
    
    export async function tick(config: Workflow) {
      logger.info('tick', '─── Tick started ───');
    
      const tickStart = Date.now();
      const now = Date.now();
      const threshold = now - config.thresholdMs;
    
      await checkDeadTasksandUpdate(threshold);
      await requeueRetryableTasks(now);
      await fetchCandidateIssue(config);
      await dispatchTasks(config);
      await VerifyTasks(config);
    
      const elapsed = Date.now() - tickStart;
      logger.info('tick', `Tick completed in ${elapsed}ms`);
    }
    import path from "node:path";
    import { fileURLToPath } from "node:url";
    import { spawn, type ChildProcess } from "node:child_process";
    import { db, eq, type Task, type WorkerEvent, logger } from "@beav/core";
    import { tasks } from "@beav/core";
    import { handleWorkerMessage } from "./worker-events.js";
    
    const workerEntryPoint = fileURLToPath(
      new URL("../../worker/dist/index.js", import.meta.url),
    );
    const activeWorkers = new Map<string, ChildProcess>();
    
    export async function loadTaskForLaunch(taskId: string): Promise<Task> {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
      });
    
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
    
      if (!task.workspacePath) {
        throw new Error(`Task ${taskId} is missing workspacePath`);
      }
    
      return task;
    }
    
    export async function launchTaskProcess(task: Task) {
      const serializedTask = JSON.stringify(task);
      const proc = spawn(
        process.execPath,
        [workerEntryPoint],
        {
          stdio: ["inherit", "inherit", "inherit", "ipc"],
          env: {
            ...process.env,
            BEAV_WORKER_TASK: serializedTask,
          },
          cwd: path.resolve(path.dirname(workerEntryPoint), "../.."),
        },
      );
    
      let workerMessages = Promise.resolve();
      activeWorkers.set(task.id, proc);
    
      proc.on("message", (message) => {
        workerMessages = workerMessages
          .then(() => handleWorkerMessage(message as WorkerEvent))
          .catch((error) => {
            logger.error(`worker:${task.id}`, "Failed to persist worker event", error);
          });
      });
    
      proc.once("exit", (code, signal) => {
        activeWorkers.delete(task.id);
        logger.info(`worker:${task.id}`, `Process exited (code=${code ?? "null"}, signal=${signal ?? "null"})`);
      });
    
      proc.once("error", (error) => {
        activeWorkers.delete(task.id);
        logger.error(`worker:${task.id}`, "Process spawn error", error);
      });
    
      await db.update(tasks)
        .set({
          workerPid: proc.pid,
          status: "running",
          startedAt: Date.now(),
        })
        .where(eq(tasks.id, task.id));
    
      logger.info(`worker:${task.id}`, `Spawned worker PID ${proc.pid}`);
    
      return proc.pid;
    }
    
    export async function stopActiveWorkers(signal: NodeJS.Signals = "SIGTERM") {
      if (activeWorkers.size === 0) {
        logger.info("orchestrator", "No active workers to stop");
        return;
      }
    
      logger.info("orchestrator", `Stopping ${activeWorkers.size} active worker(s)...`);
    
      const exits = Array.from(activeWorkers.entries()).map(([taskId, proc]) => {
        return new Promise<void>((resolve) => {
          if (proc.exitCode != null || proc.killed) {
            activeWorkers.delete(taskId);
            resolve();
            return;
          }
    
          const timeout = setTimeout(() => {
            logger.warn(`worker:${taskId}`, "Worker did not exit within 5s, force killing");
            try {
              proc.kill("SIGKILL");
            } catch (error) {
              logger.error(`worker:${taskId}`, "Failed to force kill worker", error);
            }
          }, 5000);
    
          proc.once("exit", () => {
            clearTimeout(timeout);
            resolve();
          });
    
          try {
            proc.kill(signal);
            logger.info(`worker:${taskId}`, `Sent ${signal} to worker`);
          } catch (error) {
            clearTimeout(timeout);
            logger.error(`worker:${taskId}`, "Failed to send signal to worker", error);
            resolve();
          }
        });
      });
    
      await Promise.all(exits);
      logger.info("orchestrator", "All workers stopped");
    }
    export function computeRetryDelayMs(attempt: number): number {
      return 10_000 * 2 ** attempt;
    }
    import { db } from '@beav/core/db';
    import {
      handleWorkerMessage as handleWorkerMessageWithDatabase,
      persistWorkerEvent as persistWorkerEventWithDatabase,
    } from './worker-event-store.js';
    import type { db as coreDb } from '@beav/core/db';
    import type { WorkerEvent } from '@beav/core/worker-events';
    
    type WorkerEventDatabase = Pick<typeof coreDb, 'insert' | 'update'>;
    
    export async function persistWorkerEvent(
      event: WorkerEvent,
      database: WorkerEventDatabase = db,
    ) {
      await persistWorkerEventWithDatabase(event, database);
    }
    
    export async function handleWorkerMessage(
      message: unknown,
      database: WorkerEventDatabase = db,
    ) {
      await handleWorkerMessageWithDatabase(message, database);
    }
    import { eq } from 'drizzle-orm';
    import { taskLogs, tasks } from '@beav/core/schema';
    import { type WorkerEvent, isWorkerEvent } from '@beav/core/worker-events';
    import type { db as coreDb } from '@beav/core/db';
    
    type WorkerEventDatabase = Pick<typeof coreDb, 'insert' | 'update'>;
    
    export async function persistWorkerEvent(
      event: WorkerEvent,
      database: WorkerEventDatabase,
    ) {
      switch (event.type) {
        case 'heartbeat':
          await database
            .update(tasks)
            .set({ lastHeartbeat: event.ts })
            .where(eq(tasks.id, event.taskId));
          return;
        case 'log':
          await database.insert(taskLogs).values({
            taskId: event.taskId,
            stream: event.stream,
            line: event.line,
            ts: event.ts,
          });
          return;
        case 'thread-state':
          await database
            .update(tasks)
            .set({
              threadId: event.threadId,
              turnId: event.turnId,
            })
            .where(eq(tasks.id, event.taskId));
          return;
        case 'failed': {
          await database.insert(taskLogs).values({
            taskId: event.taskId,
            stream: 'system',
            line: `worker error: ${event.error}`,
            ts: event.ts,
          });
          const nextRetryCount = event.retryCount + 1;
          const maxRetries = 3;
          const nextRetryAt =
            nextRetryCount >= maxRetries
              ? null
              : event.ts + 10_000 * 2 ** nextRetryCount;
          await database
            .update(tasks)
            .set({
              status: 'failed',
              retryCount: nextRetryCount,
              nextRetryAt,
              workspacePath: null,
              threadId: null,
              turnId: null,
              workerPid: null,
              lastHeartbeat: null,
            })
            .where(eq(tasks.id, event.taskId));
          return;
        }
        case 'completed':
          await database
            .update(tasks)
            .set({
              status: 'verifying',
              completedAt: event.completedAt,
              prNumber: event.prNumber,
              prURL: event.prUrl,
              workspacePath: null,
              threadId: null,
              turnId: null,
              workerPid: null,
              lastHeartbeat: null,
            })
            .where(eq(tasks.id, event.taskId));
          return;
      }
    }
    
    export async function handleWorkerMessage(
      message: unknown,
      database: WorkerEventDatabase,
    ) {
      if (!isWorkerEvent(message)) {
        // Log and skip unknown messages rather than crashing the chain
        console.error('[worker-event-store] Received invalid worker IPC message:', JSON.stringify(message));
        return;
      }
    
      await persistWorkerEvent(message, database);
    }
    ✓ • 0ms

## Activity

    $ cat packages/tracker/src/{index,github,status}.ts && cat packages/core/src/types.ts && cat packages/cli/src/index.ts
    export * from "./github.js"import { Octokit } from '@octokit/rest';
    import { TrackedIssueSchema, type TrackedIssue, logger } from '@beav/core';
    import { db, eq } from '@beav/core';
    import { tasks } from '@beav/core';
    import { ulid } from 'ulid';
    import { type Workflow } from '@beav/core';
    
    export async function fetchIssue(
      owner: string,
      repo: string,
      label: string,
      ghToken: string,
    ) {
      logger.info('tracker', `Fetching open issues from ${owner}/${repo} with label "${label}"`);
    
      try {
        const octokit = new Octokit({
          auth: ghToken,
        });
    
        const { data } = await octokit.rest.issues.listForRepo({
          owner,
          repo,
          labels: label,
          state: 'open',
        });
    
        logger.info('tracker', `Found ${data.length} open issue(s) with label "${label}"`);
    
        const errors: unknown[] = [];
        let added = 0;
        let skipped = 0;
    
        for (const issue of data) {
          const clean = TrackedIssueSchema.safeParse({
            githubIssueId: issue.id,
            githubIssueNumber: issue.number,
            issueTitle: issue.title,
            htmlUrl: issue.html_url,
            repoOwner: owner,
            repoName: repo,
            body: issue.body || null,
          });
    
          if (!clean.success) {
            logger.warn('tracker', `Validation failed for issue #${issue.number} (ID: ${issue.id})`);
            errors.push({
              type: 'VALIDATION_ERROR',
              issueNumber: issue.number,
              detail: clean.error.flatten(),
            });
            skipped++;
            continue;
          }
    
          const error = await savetoDB(clean.data);
          if (error) {
            logger.warn('tracker', `Database conflict for issue #${issue.number}: ${error instanceof Error ? error.message : String(error)}`);
            errors.push(error);
            skipped++;
            continue;
          }
    
          added++;
          logger.info('tracker', `Tracked issue #${issue.number}: ${issue.title}`);
        }
    
        logger.info('tracker', `Sync complete: ${added} added, ${skipped} skipped`);
    
        return {
          added,
          skipped,
          errors,
        };
      } catch (error) {
        logger.error('tracker', `GitHub API fetch failed: ${error instanceof Error ? error.message : String(error)}`);
        return {
          added: 0,
          skipped: 0,
          errors: [
            {
              type: 'FETCH_ERROR',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    }
    
    async function mark(id: string, status: "done" | "failed") {
      await db.update(tasks)
        .set({ status })
        .where(eq(tasks.id, id));
    
      logger.info(`verify:${id}`, `Marked as ${status}`);
    }
    
    export async function checkVerifyingTasks(config: Workflow) {
      const verifying = await db.query.tasks.findMany({
        where: eq(tasks.status, "verifying"),
      });
    
      if (verifying.length === 0) return;
    
      logger.info('verifier', `Checking ${verifying.length} verifying task(s)`);
    
      const octokit = new Octokit({
        auth: config.ghToken
      });
    
      const concurrency = 5;
    
      const verifyTask = async (task: Awaited<typeof verifying>[number]) => {
        try {
          if (task.prNumber == null) {
            logger.error(`verify:${task.id}`, "Missing prNumber → failed");
            await mark(task.id, "failed");
            return;
          }
    
          const { data: pr } = await octokit.pulls.get({
            owner: task.repoOwner,
            repo: task.repoName,
            pull_number: task.prNumber,
          });
    
          logger.info(`verify:${task.id}`, `PR #${pr.number}: state=${pr.state}, merged=${pr.merged_at != null}`);
    
          // merged = done
          if (pr.merged_at) {
            logger.info(`verify:${task.id}`, "PR merged → deleting from DB");
            await db.delete(tasks).where(eq(tasks.id, task.id));
            return;
          }
    
          // closed without merge = failed
          if (pr.state === "closed") {
            await mark(task.id, "failed");
            return;
          }
    
          const { data } = await octokit.checks.listForRef({
            owner: task.repoOwner,
            repo: task.repoName,
            ref: pr.head.sha,
          });
    
          const runs = data.check_runs;
    
          // no CI = wait for merge
          if (runs.length === 0) {
            logger.info(`verify:${task.id}`, "No CI checks found → waiting for merge");
            return;
          }
    
          logger.info(`verify:${task.id}`, `${runs.length} check run(s) found`);
    
          // any fail = failed
          if (runs.some(r => r.conclusion === "failure")) {
            logger.info(`verify:${task.id}`, "At least one check failed → marking failed");
            await mark(task.id, "failed");
            return;
          }
    
          // all success = wait for merge
          if (
            runs.every(
              r =>
                r.status === "completed" &&
                r.conclusion === "success"
            )
          ) {
            logger.info(`verify:${task.id}`, "All checks passed → waiting for merge");
            return;
          }
    
          logger.info(`verify:${task.id}`, "Checks still in progress → staying verifying");
    
        } catch (err) {
          logger.error(`verify:${task.id}`, `Verification error`, err);
        }
      };
    
      for (let index = 0; index < verifying.length; index += concurrency) {
        const batch = verifying.slice(index, index + concurrency);
        logger.info('verifier', `Processing batch ${Math.floor(index / concurrency) + 1} (${batch.length} tasks)`);
        await Promise.allSettled(batch.map(verifyTask));
      }
    }
    
    async function savetoDB(task: TrackedIssue) {
      try {
        await db
          .insert(tasks)
          .values({
            id: ulid(),
            ...task,
            status: 'pending',
            createdAt: Date.now(),
          })
          .onConflictDoNothing({
            target: [tasks.repoOwner, tasks.repoName, tasks.githubIssueNumber],
          });
        return null;
      } catch (error) {
        return error;
      }
    }
    import { db, tasks } from '@beav/core';
    
    export default async function status() {
        return db.select().from(tasks).orderBy(tasks.createdAt);
    }
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
    const commandraw = process.argv[2];
    const arg = process.argv[3];
    
    const command = commandraw?.toLowerCase().trim()
    
    async function main() {
      switch (command) {
        case 'setup': {
          const { setup } = await import('./setup.js');
          await setup();
          break;
        }
    
        case 'start': {
          const { start } = await import('@beav/orchestrator');
          await start();
          break;
        }
        case 'status':
          console.log('beav status');
          break;
        case 'logs':
          console.log('beav logs');
          break;
        case 'worker': {
          if (!arg) {
            throw new Error('Usage: beav worker <taskId>');
          }
    
          const { launchTaskProcess, loadTaskForLaunch } = await import('@beav/orchestrator');
          const task = await loadTaskForLaunch(arg);
          const pid = await launchTaskProcess(task);
          console.log(`Launched worker ${pid} for task ${arg}`);
          break;
        }
        default:
          console.log('Usage: beav <setup|start|status|logs|worker>');
      }
    }
    
    void main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
    ✓ • 0ms

## Activity

    $ for p in /AGENTS.md /home/AGENTS.md /home/pranav/AGENTS.md /home/pranav/projects/AGENTS.md; do if test -f "$p"; then cat "$p"; fi; done
    ✓ • 0ms

## Activity

    $ cat packages/worker/src/{index,gitcommands}.ts && cat packages/orchestrator/test/worker-events.test.mjs
    import { spawn, type ChildProcessByStdio } from 'node:child_process';
    import fs from 'node:fs/promises';
    import readline from 'node:readline';
    import type { Readable, Writable } from 'node:stream';
    import { type Task, type WorkerEvent, logger } from '@beav/core';
    import { createPR } from './gitcommands.js';
    
    type WorkerProc = ChildProcessByStdio<Writable, Readable, Readable>;
    
    // Lines from codex stderr to silently discard
    const NOISE_PATTERNS = [
      /bubblewrap/i,
      /bwrap/i,
      /^\s*$/,
    ];
    
    let rpcId = 0;
    const nextId = (): number => ++rpcId;
    
    const pending = new Map<number, {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
    }>();
    
    function readTaskFromEnv(): Task {
      const rawTask = process.env.BEAV_WORKER_TASK;
    
      if (!rawTask) {
        throw new Error('BEAV_WORKER_TASK is required');
      }
    
      const task = JSON.parse(rawTask) as Task;
    
      if (!task.id) {
        throw new Error('BEAV_WORKER_TASK is missing task.id');
      }
    
      if (!task.workspacePath) {
        throw new Error(`Task ${task.id} is missing workspacePath`);
      }
    
      return task;
    }
    
    function sendParentEvent(event: WorkerEvent): Promise<void> {
      if (typeof process.send !== 'function') {
        return Promise.reject(
          new Error('Worker must be started with an IPC channel'),
        );
      }
    
      return new Promise((resolve, reject) => {
        process.send?.(event, (error) => {
          if (error) {
            reject(error);
            return;
          }
    
          resolve();
        });
      });
    }
    
    async function cleanupTask(proc: WorkerProc, task: Task, tag: string) {
      if (task.workspacePath) {
        logger.info(tag, `Cleaning up workspace`);
        await fs.rm(task.workspacePath, { recursive: true, force: true });
      }
    
      try {
        proc.kill('SIGKILL');
        logger.info(tag, 'Killed codex process');
      } catch (error) {
        logger.error(tag, 'Failed to kill worker child process', error);
      }
    }
    
    async function run(task: Task) {
      const tag = `worker:${task.id.slice(-8)}`;
    
      logger.info(tag, `Issue #${task.githubIssueNumber}: ${task.issueTitle}`);
      logger.info(tag, `Workspace: ${task.workspacePath}`);
    
      const proc: WorkerProc = spawn('codex', ['app-server'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    
      // Filter codex stderr — suppress known noise, pass real errors through
      readline.createInterface({ input: proc.stderr }).on('line', (line) => {
        if (NOISE_PATTERNS.some((p) => p.test(line))) return;
        logger.error(tag, `[codex] ${line}`);
      });
      const signalHandlers = new Map<NodeJS.Signals, () => void>();
    
      const rejectPending = (error: Error) => {
        for (const { reject } of pending.values()) {
          reject(error);
        }
        pending.clear();
      };
    
      const heartbeatInterval = setInterval(() => {
        void sendParentEvent({
          type: 'heartbeat',
          taskId: task.id,
          ts: Date.now(),
        }).catch((error) => {
          logger.error(tag, 'Heartbeat failed', error);
        });
      }, 15 * 1000);
    
      let completed = false;
      let cleanedUp = false;
    
      // Hard timeout: if the agent hasn't completed within 10 minutes, kill it.
      const WORKER_TIMEOUT_MS = 10 * 60 * 1000;
      const workerTimeout = setTimeout(() => {
        logger.error(tag, 'Worker timeout exceeded (10 min) — forcing failure');
        void finalizeFailure(new Error('Worker timeout exceeded')).finally(() => {
          process.exit(1);
        });
      }, WORKER_TIMEOUT_MS);
    
      const removeSignalHandlers = () => {
        for (const [signal, handler] of signalHandlers) {
          process.removeListener(signal, handler);
        }
        signalHandlers.clear();
      };
    
      const finalizeFailure = async (error: unknown) => {
        if (completed) return;
        completed = true;
        clearInterval(heartbeatInterval);
        clearTimeout(workerTimeout);
        removeSignalHandlers();
    
        const message = error instanceof Error ? error.message : String(error);
        logger.error(tag, `FAILED: ${message}`);
    
        try {
          await sendParentEvent({
            type: 'failed',
            taskId: task.id,
            error: message,
            ts: Date.now(),
            retryCount: task.retryCount ?? 0,
          });
        } catch (sendError) {
          logger.error(tag, 'Failed to send worker failure event', sendError);
        } finally {
          if (!cleanedUp) {
            cleanedUp = true;
            try {
              await cleanupTask(proc, task, tag);
            } catch (cleanupError) {
              logger.error(tag, 'Cleanup after failure failed', cleanupError);
            }
          }
        }
      };
    
      proc.on('exit', (code, signal) => {
        rejectPending(
          new Error(
            `codex app-server exited before replying${code != null ? ` with code ${code}` : ''}${signal ? ` (${signal})` : ''}`,
          ),
        );
        if (!completed) {
          void finalizeFailure(
            new Error('codex app-server exited unexpectedly'),
          ).finally(() => {
            process.exit(1);
          });
        }
      });
    
      proc.on('error', (error) => {
        rejectPending(error instanceof Error ? error : new Error(String(error)));
        if (!completed) {
          void finalizeFailure(error).finally(() => {
            process.exit(1);
          });
        }
      });
    
      const rl = readline.createInterface({ input: proc.stdout });
    
      const send = (method: string, params?: any): Promise<any> => {
        const id = nextId();
        const payload = JSON.stringify({ method, id, params }) + '\n';
    
        logger.info(tag, `→ ${method}`);
    
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
          proc.stdin.write(payload, (error) => {
            if (!error) {
              return;
            }
    
            pending.delete(id);
            reject(error);
          });
        });
      };
    
      const handleServerRequest = (msg: any) => {
        // Server-initiated requests have both id and method.
        // We MUST respond or codex blocks forever waiting for our reply.
        if (
          msg.method === 'item/commandExecution/requestApproval' ||
          msg.method === 'item/fileChange/requestApproval'
        ) {
          logger.info(tag, `Auto-approving: ${msg.method} (id: ${msg.id})`);
          proc.stdin.write(
            JSON.stringify({ id: msg.id, result: { approved: true } }) + '\n',
          );
          return;
        }
    
        // Unknown server request — respond with empty result so codex doesn't block
        logger.info(tag, `Unknown server request: ${msg.method} (id: ${msg.id}) — auto-responding`);
        proc.stdin.write(
          JSON.stringify({ id: msg.id, result: {} }) + '\n',
        );
      };
    
      const handleLine = async (line: string) => {
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          return;
        }
    
        // Server-initiated request: has BOTH id AND method.
        // Must respond or codex hangs waiting for approval.
        if (msg.id !== undefined && msg.method) {
          handleServerRequest(msg);
          return;
        }
    
        // Response to one of OUR requests: has id but no method.
        if (msg.id !== undefined) {
          const resolver = pending.get(msg.id);
          if (resolver) {
            pending.delete(msg.id);
            if (msg.error) {
              logger.error(tag, `← RPC error for id ${msg.id}: ${msg.error.message ?? 'unknown'}`);
              resolver.reject(
                new Error(
                  typeof msg.error?.message === 'string'
                    ? msg.error.message
                    : 'Worker request failed',
                ),
              );
              return;
            }
    
            resolver.resolve(msg.result);
          }
          return;
        }
    
        // Server notifications (no id): streaming events
        if (msg.method === 'item/agentMessage/delta') {
          const text = msg.params?.delta || '';
    
          if (text.trim()) {
            await sendParentEvent({
              type: 'log',
              taskId: task.id,
              stream: 'system',
              line: text,
              ts: Date.now(),
            });
          }
        }
    
        if (msg.method === 'turn/completed') {
          const status = msg.params?.turn?.status;
          logger.info(tag, `Turn completed (status: ${status ?? 'unknown'})`);
    
          if (status === 'failed') {
            await finalizeFailure(new Error('Agent turn completed with failed status'));
            return;
          }
    
          logger.info(tag, 'Creating PR...');
          const prResult = await createPR(task);
          if (!prResult) {
            await finalizeFailure(new Error('createPR returned false'));
            return;
          }
    
          await sendParentEvent({
            type: 'completed',
            taskId: task.id,
            completedAt: Date.now(),
            prNumber: prResult.prNumber,
            prUrl: prResult.prUrl,
          });
    
          if (!cleanedUp) {
            cleanedUp = true;
            await cleanupTask(proc, task, tag);
          }
          process.exit(0);
        }
      };
    
      rl.on('line', (line) => {
        if (process.env.DEBUG_CODEX_RAW === '1') {
          process.stderr.write(`[CODEX RAW] ${line}\n`);
        }
        void handleLine(line).catch((error) => {
          void finalizeFailure(error).finally(() => {
            process.exit(1);
          });
        });
      });
    
      for (const signal of ['SIGINT', 'SIGTERM'] as const) {
        const handler = () => {
          void finalizeFailure(new Error(`Worker received ${signal}`)).finally(() => {
            process.exit(1);
          });
        };
        signalHandlers.set(signal, handler);
        process.on(signal, handler);
      }
    
      try {
        await send('initialize', {
          clientInfo: {
            name: 'beav-worker',
            version: '0.1.0',
          },
        });
    
        logger.info(tag, 'Sending initialized notification');
        proc.stdin.write(
          JSON.stringify({ method: 'initialized', params: {} }) + '\n',
        );
    
        logger.info(tag, 'Starting thread with model gpt-5.4 (full-auto)');
        const threadRes: any = await send('thread/start', {
          model: 'gpt-5.4',
          cwd: task.workspacePath,
          approval_policy: 'never',
          sandbox: 'danger-full-access',
        });
    
        const threadId = threadRes?.thread?.id;
        if (!threadId) {
          throw new Error('thread/start did not return thread.id');
        }
    
        logger.info(tag, `Thread started: ${threadId}`);
    
        const turnRes: any = await send('turn/start', {
          threadId,
          input: [
            {
              type: 'text',
              text: `
            You are an autonomous software engineer. Act immediately — do NOT ask for confirmation or approval before running commands.
    
            Goal:
            Fix the GitHub issue described below.
    
            Constraints:
            - Make minimal, correct changes
            - Do NOT break existing functionality
            - Ensure all tests pass
            - If tests fail, fix them
            - Do NOT create pull requests or push changes
            - You may perform AT MOST 5 tool-use iterations. If you cannot fix the issue in 5 iterations, STOP and explain why.
            - Never wait for user approval. Execute all commands automatically.
    
            Process:
            1. Understand the issue
            2. Locate relevant code
            3. Implement fix
            4. Run tests (ensure the test command exits — do NOT run watch mode)
            5. If tests fail and you have iterations remaining, fix and re-run. Otherwise stop.
    
            Output:
            - Modify files directly in the workspace
            - Ensure repository is in a clean working state
    
            Issue:
            Title: ${task.issueTitle}
    
            Body:
            ${task.body}
            `,
            },
          ],
        });
    
        const turnId = turnRes?.turn?.id;
        if (!turnId) {
          throw new Error('turn/start did not return turn.id');
        }
    
        logger.info(tag, `Turn started: ${turnId}. Waiting for completion...`);
    
        await sendParentEvent({
          type: 'thread-state',
          taskId: task.id,
          threadId,
          turnId,
        });
      } catch (error) {
        await finalizeFailure(error);
        process.exit(1);
      }
    }
    
    async function main() {
      const task = readTaskFromEnv();
      await run(task);
    }
    
    void main().catch(async (error) => {
      logger.error('worker', 'Uncaught top-level promise rejection', error);
    
      try {
        const task = readTaskFromEnv();
        await sendParentEvent({
          type: 'failed',
          taskId: task.id,
          error: error instanceof Error ? error.message : String(error),
          ts: Date.now(),
          retryCount: task.retryCount ?? 0,
        });
      } catch (sendError) {
        logger.error('worker', 'Failed to send uncaught failure event', sendError);
      }
    
      process.exit(1);
    });
    import { spawn } from 'node:child_process';
    import { type Task } from '@beav/core';
    
    function run(command: string, args: string[], cwd: string): Promise<string> {
      return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
    
        proc.stdout.on('data', (chunk) => {
          stdout += chunk.toString();
        });
        proc.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
        proc.on('error', reject);
        proc.on('close', (code) => {
          if (code === 0) {
            resolve(stdout);
            return;
          }
    
          reject(stderr || `Command failed with exit code ${code}`);
        });
      });
    }
    
    async function prExists(branch: string, cwd: string): Promise<{ exists: boolean; number: number | null; url: string | null }> {
      try {
        const res = await run(
          'gh',
          ['pr', 'list', '--head', branch, '--json', 'number,url', '--jq', '.[0]'],
          cwd,
        );
        const trimmed = res.trim();
        if (!trimmed) {
          return { exists: false, number: null, url: null };
        }
        const pr = JSON.parse(trimmed);
        return { exists: true, number: pr.number, url: pr.url };
      } catch {
        return { exists: false, number: null, url: null };
      }
    }
    
    export async function createPR(task: Task): Promise<{ prNumber: number; prUrl: string } | false> {
      const cwd = task.workspacePath;
      if (!cwd) {
        throw new Error(`Task ${task.id} is missing workspacePath`);
      }
      const branch = `beav-fix-${task.id}`;
    
      console.error(`[pr] Creating branch: ${branch}`);
      await run('git', ['checkout', '-B', branch], cwd);
    
      console.error('[pr] Staging changes...');
      await run('git', ['add', '.'], cwd);
    
      // avoid empty commit
      try {
        await run('git', ['diff', '--cached', '--quiet'], cwd);
        console.error('[pr] No changes to commit → skipping');
        return false;
      } catch {
        const safeTitle = task.issueTitle.replace(/[\n\r]/g, ' ');
        console.error(`[pr] Committing: fix: ${safeTitle}`);
        await run('git', ['commit', '-m', `fix: ${safeTitle}`], cwd);
      }
    
      console.error('[pr] Pushing branch to origin...');
      await run('git', ['push', '-u', 'origin', branch], cwd);
    
      const existing = await prExists(branch, cwd);
    
      if (!existing.exists) {
        console.error(`[pr] Creating PR for ${branch} → #${task.githubIssueNumber}`);
        try {
          const prUrl = await run(
            'gh',
            [
              'pr',
              'create',
              '--base',
              'main',
              '--head',
              branch,
              '--title',
              task.issueTitle,
              '--body',
              `Auto fix\n\nCloses #${task.githubIssueNumber}`,
            ],
            cwd,
          );
          const cleanUrl = prUrl.trim();
          console.error('[pr] PR created successfully:', cleanUrl);
          const prNumber = parseInt(cleanUrl.split('/').pop()!, 10);
          return { prNumber, prUrl: cleanUrl };
        } catch (error) {
          console.error('[pr] PR creation failed:', error);
          return false;
        }
      } else {
        console.error('[pr] PR already exists → skipping');
        return { prNumber: existing.number!, prUrl: existing.url! };
      }
    }
    import assert from 'node:assert/strict';
    import test from 'node:test';
    import { taskLogs, tasks } from '@beav/core/schema';
    import { handleWorkerMessage } from '../dist/worker-event-store.js';
    
    function createRecorder() {
      const operations = [];
    
      const makeWriteApi = () => ({
        insert(table) {
          return {
            values(payload) {
              operations.push({ kind: 'insert', table, payload });
              return Promise.resolve();
            },
          };
        },
        update(table) {
          return {
            set(payload) {
              return {
                where(whereClause) {
                  operations.push({ kind: 'update', table, payload, whereClause });
                  return Promise.resolve();
                },
              };
            },
          };
        },
      });
    
      const writeApi = makeWriteApi();
    
      return {
        operations,
        db: {
          ...writeApi,
          transaction(callback) {
            return callback(makeWriteApi());
          },
        },
      };
    }
    
    test('persists worker heartbeat and thread state updates', async () => {
      const { operations, db } = createRecorder();
    
      await handleWorkerMessage({
        type: 'thread-state',
        taskId: 'task-1',
        threadId: 'thread-1',
        turnId: 'turn-1',
      }, db);
      await handleWorkerMessage({
        type: 'heartbeat',
        taskId: 'task-1',
        ts: 12345,
      }, db);
    
      assert.equal(operations.length, 2);
      assert.equal(operations[0]?.kind, 'update');
      assert.equal(operations[0]?.table, tasks);
      assert.deepEqual(operations[0]?.payload, {
        threadId: 'thread-1',
        turnId: 'turn-1',
      });
      assert.equal(operations[1]?.kind, 'update');
      assert.equal(operations[1]?.table, tasks);
      assert.deepEqual(operations[1]?.payload, {
        lastHeartbeat: 12345,
      });
    });
    
    test('persists worker failure as a log entry and failed task state', async () => {
      const { operations, db } = createRecorder();
    
      await handleWorkerMessage({
        type: 'failed',
        taskId: 'task-2',
        error: 'boom',
        ts: 42,
      }, db);
    
      assert.equal(operations.length, 2);
      assert.equal(operations[0]?.kind, 'insert');
      assert.equal(operations[0]?.table, taskLogs);
      assert.deepEqual(operations[0]?.payload, {
        taskId: 'task-2',
        stream: 'system',
        line: 'worker error: boom',
        ts: 42,
      });
      assert.equal(operations[1]?.kind, 'update');
      assert.equal(operations[1]?.table, tasks);
      assert.deepEqual(operations[1]?.payload, {
        status: 'failed',
        workspacePath: null,
        threadId: null,
        turnId: null,
        workerPid: null,
        lastHeartbeat: null,
      });
    });
    
    test('persists worker completion as verifying state cleanup', async () => {
      const { operations, db } = createRecorder();
    
      await handleWorkerMessage({
        type: 'completed',
        taskId: 'task-3',
        completedAt: 777,
      }, db);
    
      assert.equal(operations.length, 1);
      assert.equal(operations[0]?.kind, 'update');
      assert.equal(operations[0]?.table, tasks);
      assert.deepEqual(operations[0]?.payload, {
        status: 'verifying',
        completedAt: 777,
        workspacePath: null,
        threadId: null,
        turnId: null,
        workerPid: null,
        lastHeartbeat: null,
      });
    });
    ✓ • 0ms

## Assistant

The main pipeline is implemented, but two claims need careful wording: the workspaces are separate clones, not security sandboxes, and only task claiming has a conditional database guard. I’m checking recovery and CI handling so the guide can explain exactly where those guarantees end.

## Activity

    $ cat packages/tracker/src/github.ts && cat packages/core/src/types.ts && cat packages/orchestrator/src/worker-event-store.ts
    import { Octokit } from '@octokit/rest';
    import { TrackedIssueSchema, type TrackedIssue, logger } from '@beav/core';
    import { db, eq } from '@beav/core';
    import { tasks } from '@beav/core';
    import { ulid } from 'ulid';
    import { type Workflow } from '@beav/core';
    
    export async function fetchIssue(
      owner: string,
      repo: string,
      label: string,
      ghToken: string,
    ) {
      logger.info('tracker', `Fetching open issues from ${owner}/${repo} with label "${label}"`);
    
      try {
        const octokit = new Octokit({
          auth: ghToken,
        });
    
        const { data } = await octokit.rest.issues.listForRepo({
          owner,
          repo,
          labels: label,
          state: 'open',
        });
    
        logger.info('tracker', `Found ${data.length} open issue(s) with label "${label}"`);
    
        const errors: unknown[] = [];
        let added = 0;
        let skipped = 0;
    
        for (const issue of data) {
          const clean = TrackedIssueSchema.safeParse({
            githubIssueId: issue.id,
            githubIssueNumber: issue.number,
            issueTitle: issue.title,
            htmlUrl: issue.html_url,
            repoOwner: owner,
            repoName: repo,
            body: issue.body || null,
          });
    
          if (!clean.success) {
            logger.warn('tracker', `Validation failed for issue #${issue.number} (ID: ${issue.id})`);
            errors.push({
              type: 'VALIDATION_ERROR',
              issueNumber: issue.number,
              detail: clean.error.flatten(),
            });
            skipped++;
            continue;
          }
    
          const error = await savetoDB(clean.data);
          if (error) {
            logger.warn('tracker', `Database conflict for issue #${issue.number}: ${error instanceof Error ? error.message : String(error)}`);
            errors.push(error);
            skipped++;
            continue;
          }
    
          added++;
          logger.info('tracker', `Tracked issue #${issue.number}: ${issue.title}`);
        }
    
        logger.info('tracker', `Sync complete: ${added} added, ${skipped} skipped`);
    
        return {
          added,
          skipped,
          errors,
        };
      } catch (error) {
        logger.error('tracker', `GitHub API fetch failed: ${error instanceof Error ? error.message : String(error)}`);
        return {
          added: 0,
          skipped: 0,
          errors: [
            {
              type: 'FETCH_ERROR',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    }
    
    async function mark(id: string, status: "done" | "failed") {
      await db.update(tasks)
        .set({ status })
        .where(eq(tasks.id, id));
    
      logger.info(`verify:${id}`, `Marked as ${status}`);
    }
    
    export async function checkVerifyingTasks(config: Workflow) {
      const verifying = await db.query.tasks.findMany({
        where: eq(tasks.status, "verifying"),
      });
    
      if (verifying.length === 0) return;
    
      logger.info('verifier', `Checking ${verifying.length} verifying task(s)`);
    
      const octokit = new Octokit({
        auth: config.ghToken
      });
    
      const concurrency = 5;
    
      const verifyTask = async (task: Awaited<typeof verifying>[number]) => {
        try {
          if (task.prNumber == null) {
            logger.error(`verify:${task.id}`, "Missing prNumber → failed");
            await mark(task.id, "failed");
            return;
          }
    
          const { data: pr } = await octokit.pulls.get({
            owner: task.repoOwner,
            repo: task.repoName,
            pull_number: task.prNumber,
          });
    
          logger.info(`verify:${task.id}`, `PR #${pr.number}: state=${pr.state}, merged=${pr.merged_at != null}`);
    
          // merged = done
          if (pr.merged_at) {
            logger.info(`verify:${task.id}`, "PR merged → deleting from DB");
            await db.delete(tasks).where(eq(tasks.id, task.id));
            return;
          }
    
          // closed without merge = failed
          if (pr.state === "closed") {
            await mark(task.id, "failed");
            return;
          }
    
          const { data } = await octokit.checks.listForRef({
            owner: task.repoOwner,
            repo: task.repoName,
            ref: pr.head.sha,
          });
    
          const runs = data.check_runs;
    
          // no CI = wait for merge
          if (runs.length === 0) {
            logger.info(`verify:${task.id}`, "No CI checks found → waiting for merge");
            return;
          }
    
          logger.info(`verify:${task.id}`, `${runs.length} check run(s) found`);
    
          // any fail = failed
          if (runs.some(r => r.conclusion === "failure")) {
            logger.info(`verify:${task.id}`, "At least one check failed → marking failed");
            await mark(task.id, "failed");
            return;
          }
    
          // all success = wait for merge
          if (
            runs.every(
              r =>
                r.status === "completed" &&
                r.conclusion === "success"
            )
          ) {
            logger.info(`verify:${task.id}`, "All checks passed → waiting for merge");
            return;
          }
    
          logger.info(`verify:${task.id}`, "Checks still in progress → staying verifying");
    
        } catch (err) {
          logger.error(`verify:${task.id}`, `Verification error`, err);
        }
      };
    
      for (let index = 0; index < verifying.length; index += concurrency) {
        const batch = verifying.slice(index, index + concurrency);
        logger.info('verifier', `Processing batch ${Math.floor(index / concurrency) + 1} (${batch.length} tasks)`);
        await Promise.allSettled(batch.map(verifyTask));
      }
    }
    
    async function savetoDB(task: TrackedIssue) {
      try {
        await db
          .insert(tasks)
          .values({
            id: ulid(),
            ...task,
            status: 'pending',
            createdAt: Date.now(),
          })
          .onConflictDoNothing({
            target: [tasks.repoOwner, tasks.repoName, tasks.githubIssueNumber],
          });
        return null;
      } catch (error) {
        return error;
      }
    }
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
    import { eq } from 'drizzle-orm';
    import { taskLogs, tasks } from '@beav/core/schema';
    import { type WorkerEvent, isWorkerEvent } from '@beav/core/worker-events';
    import type { db as coreDb } from '@beav/core/db';
    
    type WorkerEventDatabase = Pick<typeof coreDb, 'insert' | 'update'>;
    
    export async function persistWorkerEvent(
      event: WorkerEvent,
      database: WorkerEventDatabase,
    ) {
      switch (event.type) {
        case 'heartbeat':
          await database
            .update(tasks)
            .set({ lastHeartbeat: event.ts })
            .where(eq(tasks.id, event.taskId));
          return;
        case 'log':
          await database.insert(taskLogs).values({
            taskId: event.taskId,
            stream: event.stream,
            line: event.line,
            ts: event.ts,
          });
          return;
        case 'thread-state':
          await database
            .update(tasks)
            .set({
              threadId: event.threadId,
              turnId: event.turnId,
            })
            .where(eq(tasks.id, event.taskId));
          return;
        case 'failed': {
          await database.insert(taskLogs).values({
            taskId: event.taskId,
            stream: 'system',
            line: `worker error: ${event.error}`,
            ts: event.ts,
          });
          const nextRetryCount = event.retryCount + 1;
          const maxRetries = 3;
          const nextRetryAt =
            nextRetryCount >= maxRetries
              ? null
              : event.ts + 10_000 * 2 ** nextRetryCount;
          await database
            .update(tasks)
            .set({
              status: 'failed',
              retryCount: nextRetryCount,
              nextRetryAt,
              workspacePath: null,
              threadId: null,
              turnId: null,
              workerPid: null,
              lastHeartbeat: null,
            })
            .where(eq(tasks.id, event.taskId));
          return;
        }
        case 'completed':
          await database
            .update(tasks)
            .set({
              status: 'verifying',
              completedAt: event.completedAt,
              prNumber: event.prNumber,
              prURL: event.prUrl,
              workspacePath: null,
              threadId: null,
              turnId: null,
              workerPid: null,
              lastHeartbeat: null,
            })
            .where(eq(tasks.id, event.taskId));
          return;
      }
    }
    
    export async function handleWorkerMessage(
      message: unknown,
      database: WorkerEventDatabase,
    ) {
      if (!isWorkerEvent(message)) {
        // Log and skip unknown messages rather than crashing the chain
        console.error('[worker-event-store] Received invalid worker IPC message:', JSON.stringify(message));
        return;
      }
    
      await persistWorkerEvent(message, database);
    }
    ✓ • 0ms

## Activity

    $ rg -n 'export |function |setInterval|WORKER_TIMEOUT|danger-full|JSON.stringify|turn/completed|completed =|transaction|journal_mode|lastHeartbeat|returning|uniqueRepoIssue' packages/{core,tracker,orchestrator,worker}/src/*.ts && cat packages/{core,tracker,orchestrator,worker,cli}/tsconfig.json && cat tsconfig.json && git rev-parse --short HEAD
    packages/core/src/db.ts:7:sqlite.exec('PRAGMA journal_mode = WAL;');
    packages/core/src/db.ts:31:    lastHeartbeat INTEGER,
    packages/core/src/db.ts:53:export const db = drizzle(sqlite, { schema });
    packages/core/src/state-machine.ts:6:export class TaskStateMachine{
    packages/core/src/config.ts:5:export function loadConfig(env: NodeJS.ProcessEnv = process.env): Workflow {
    packages/tracker/src/github.ts:8:export async function fetchIssue(
    packages/tracker/src/github.ts:90:async function mark(id: string, status: "done" | "failed") {
    packages/tracker/src/github.ts:98:export async function checkVerifyingTasks(config: Workflow) {
    packages/tracker/src/github.ts:191:async function savetoDB(task: TrackedIssue) {
    packages/orchestrator/src/launcher.ts:13:export async function loadTaskForLaunch(taskId: string): Promise<Task> {
    packages/orchestrator/src/launcher.ts:29:export async function launchTaskProcess(task: Task) {
    packages/orchestrator/src/launcher.ts:30:  const serializedTask = JSON.stringify(task);
    packages/orchestrator/src/launcher.ts:78:export async function stopActiveWorkers(signal: NodeJS.Signals = "SIGTERM") {
    packages/core/src/schema.ts:3:export const tasks = sqliteTable("tasks", {
    packages/core/src/schema.ts:37:    lastHeartbeat: integer("lastHeartbeat"),
    packages/core/src/schema.ts:45:    uniqueRepoIssue: uniqueIndex("uniqueRepoIssue").on(
    packages/core/src/schema.ts:52:export const taskLogs = sqliteTable("taskLogs", {
    packages/orchestrator/src/worker-events.ts:11:export async function persistWorkerEvent(
    packages/orchestrator/src/worker-events.ts:18:export async function handleWorkerMessage(
    packages/core/src/workspace.ts:6:export async function setupWorkspace(
    packages/orchestrator/src/index.ts:1:export * from "./launcher.js";
    packages/orchestrator/src/index.ts:2:export * from "./retries.js";
    packages/orchestrator/src/index.ts:3:export * from "./tick.js";
    packages/orchestrator/src/index.ts:10:export async function start(workflow?: Workflow) {
    packages/orchestrator/src/index.ts:76:    timer = setInterval(() => {
    packages/orchestrator/src/worker-event-store.ts:8:export async function persistWorkerEvent(
    packages/orchestrator/src/worker-event-store.ts:16:        .set({ lastHeartbeat: event.ts })
    packages/orchestrator/src/worker-event-store.ts:59:          lastHeartbeat: null,
    packages/orchestrator/src/worker-event-store.ts:76:          lastHeartbeat: null,
    packages/orchestrator/src/worker-event-store.ts:83:export async function handleWorkerMessage(
    packages/orchestrator/src/worker-event-store.ts:89:    console.error('[worker-event-store] Received invalid worker IPC message:', JSON.stringify(message));
    packages/orchestrator/src/tick.ts:21:export async function recoverOnStartup() {
    packages/orchestrator/src/tick.ts:57:        lastHeartbeat: null,
    packages/orchestrator/src/tick.ts:73:async function killTask(taskId: string, pid: number) {
    packages/orchestrator/src/tick.ts:86:async function checkDeadTasksandUpdate(threshold: number) {
    packages/orchestrator/src/tick.ts:98:    if (task.lastHeartbeat != null && task.lastHeartbeat < threshold) {
    packages/orchestrator/src/tick.ts:123:              lastHeartbeat: null,
    packages/orchestrator/src/tick.ts:147:              lastHeartbeat: null,
    packages/orchestrator/src/tick.ts:165:async function requeueRetryableTasks(now: number) {
    packages/orchestrator/src/tick.ts:194:          lastHeartbeat: null,
    packages/orchestrator/src/tick.ts:217:async function fetchCandidateIssue(config: Workflow) {
    packages/orchestrator/src/tick.ts:248:async function dispatchTasks(config: Workflow) {
    packages/orchestrator/src/tick.ts:286:      .returning();
    packages/orchestrator/src/tick.ts:339:          lastHeartbeat: null,
    packages/orchestrator/src/tick.ts:346:async function VerifyTasks(config: Workflow) {
    packages/orchestrator/src/tick.ts:350:export async function tick(config: Workflow) {
    packages/worker/src/index.ts:25:function readTaskFromEnv(): Task {
    packages/worker/src/index.ts:45:function sendParentEvent(event: WorkerEvent): Promise<void> {
    packages/worker/src/index.ts:64:async function cleanupTask(proc: WorkerProc, task: Task, tag: string) {
    packages/worker/src/index.ts:78:async function run(task: Task) {
    packages/worker/src/index.ts:102:  const heartbeatInterval = setInterval(() => {
    packages/worker/src/index.ts:112:  let completed = false;
    packages/worker/src/index.ts:116:  const WORKER_TIMEOUT_MS = 10 * 60 * 1000;
    packages/worker/src/index.ts:122:  }, WORKER_TIMEOUT_MS);
    packages/worker/src/index.ts:133:    completed = true;
    packages/worker/src/index.ts:191:    const payload = JSON.stringify({ method, id, params }) + '\n';
    packages/worker/src/index.ts:217:        JSON.stringify({ id: msg.id, result: { approved: true } }) + '\n',
    packages/worker/src/index.ts:225:      JSON.stringify({ id: msg.id, result: {} }) + '\n',
    packages/worker/src/index.ts:281:    if (msg.method === 'turn/completed') {
    packages/worker/src/index.ts:344:      JSON.stringify({ method: 'initialized', params: {} }) + '\n',
    packages/worker/src/index.ts:352:      sandbox: 'danger-full-access',
    packages/worker/src/index.ts:422:async function main() {
    packages/tracker/src/status.ts:3:export default async function status() {
    packages/core/src/worker-events.ts:1:export type WorkerEvent =
    packages/core/src/worker-events.ts:35:export function isWorkerEvent(value: unknown): value is WorkerEvent {
    packages/orchestrator/src/retries.ts:1:export function computeRetryDelayMs(attempt: number): number {
    packages/worker/src/gitcommands.ts:4:function run(command: string, args: string[], cwd: string): Promise<string> {
    packages/worker/src/gitcommands.ts:28:async function prExists(branch: string, cwd: string): Promise<{ exists: boolean; number: number | null; url: string | null }> {
    packages/worker/src/gitcommands.ts:46:export async function createPR(task: Task): Promise<{ prNumber: number; prUrl: string } | false> {
    packages/tracker/src/index.ts:1:export * from "./github.js"
    packages/core/src/types.ts:5:export type Task = InferSelectModel<typeof tasks>;
    packages/core/src/types.ts:17:export const WorkflowSchema = z.object({
    packages/core/src/types.ts:28:export const TrackedIssueSchema = z.object({
    packages/core/src/types.ts:38:export type Workflow = z.infer<typeof WorkflowSchema>;
    packages/core/src/types.ts:39:export type TrackedIssue = z.infer<typeof TrackedIssueSchema>;
    packages/core/src/types.ts:41:export const TaskStatusEnum = z.enum([
    packages/core/src/types.ts:51:export type TaskStatus = z.infer<typeof TaskStatusEnum>;
    packages/core/src/logger.ts:15:function timestamp(): string {
    packages/core/src/logger.ts:23:function levelTag(level: LogLevel): string {
    packages/core/src/logger.ts:29:function moduleTag(module: string): string {
    packages/core/src/logger.ts:33:function format(level: LogLevel, module: string, message: string) {
    packages/core/src/logger.ts:37:export function info(module: string, message: string) {
    packages/core/src/logger.ts:41:export function warn(module: string, message: string) {
    packages/core/src/logger.ts:45:export function error(module: string, message: string, context?: unknown) {
    packages/core/src/logger.ts:54:export function taskLog(taskId: string, message: string) {
    packages/core/src/index.ts:1:export * from "./schema.js"
    packages/core/src/index.ts:2:export * from './types.js';
    packages/core/src/index.ts:3:export * from './worker-events.js';
    packages/core/src/index.ts:4:export * from './config.js';
    packages/core/src/index.ts:5:export * from './db.js';
    packages/core/src/index.ts:6:export * from "./state-machine.js"
    packages/core/src/index.ts:7:export * from "./workspace.js"
    packages/core/src/index.ts:8:export * as logger from "./logger.js";
    packages/core/src/index.ts:9:export { eq, and, lt, asc, desc, inArray, sql } from "drizzle-orm";
    {
      "extends": "../../tsconfig.json",
      "compilerOptions": {
        "rootDir": "./src",
        "outDir": "./dist"
      },
      "include": ["src/**/*"]
    }
    {
      "extends": "../../tsconfig.json",
      "compilerOptions": {
        "rootDir": "./src",
        "outDir": "./dist",
        "types": ["node"]
      },
      "include": ["src/**/*"]
    }
    {
      "extends": "../../tsconfig.json",
      "compilerOptions": {
        "rootDir": "./src",
        "outDir": "./dist"
      },
      "include": ["src/**/*"]
    }
    {
      "extends": "../../tsconfig.json",
      "compilerOptions": {
        "rootDir": "./src",
        "outDir": "./dist"
      },
      "include": ["src/**/*"]
    }
    {
      "extends": "../../tsconfig.json",
      "compilerOptions": {
        "rootDir": "./src",
        "outDir": "./dist",
        "types": ["node"]
      },
      "include": ["src/**/*"]
    }
    {
      // Visit https://aka.ms/tsconfig to read more about this file
      "compilerOptions": {
        // File Layout
        // "rootDir": "./src",
        // "outDir": "./dist",
    
        // Environment Settings
        // See also https://aka.ms/tsconfig/module
        "module": "nodenext",
        "target": "esnext",
        "types": ["node"],
        // For nodejs:
        // "lib": ["esnext"],
        // "types": ["node"],
        // and npm install -D @types/node
    
        // Other Outputs
        "sourceMap": true,
        "declaration": true,
        "declarationMap": true,
    
        // Stricter Typechecking Options
        "noUncheckedIndexedAccess": true,
        "exactOptionalPropertyTypes": true,
    
        // Style Options
        // "noImplicitReturns": true,
        // "noImplicitOverride": true,
        // "noUnusedLocals": true,
        // "noUnusedParameters": true,
        // "noFallthroughCasesInSwitch": true,
        // "noPropertyAccessFromIndexSignature": true,
    
        // Recommended Options
        "strict": true,
        "jsx": "react-jsx",
        "verbatimModuleSyntax": true,
        "isolatedModules": true,
        "noUncheckedSideEffectImports": true,
        "moduleDetection": "force",
        "skipLibCheck": true,
      }
    }
    ad67746
    ✓ • 0ms

## Activity

    Opened https://www.sqlite.org/wal.html

## Activity

    $ rg -n 'nextRetryCount|retryCount|prNumber|isWorkerEvent|status:' packages/orchestrator/dist/worker-event-store.js packages/core/dist/worker-events.js && git status --short
    packages/core/dist/worker-events.js:1:export function isWorkerEvent(value) {
    packages/core/dist/worker-events.js:23:                typeof event.retryCount === 'number');
    packages/core/dist/worker-events.js:27:                typeof event.prNumber === 'number' &&
    packages/orchestrator/dist/worker-event-store.js:3:import { isWorkerEvent } from '@beav/core/worker-events';
    packages/orchestrator/dist/worker-event-store.js:36:            const nextRetryCount = event.retryCount + 1;
    packages/orchestrator/dist/worker-event-store.js:38:            const nextRetryAt = nextRetryCount >= maxRetries
    packages/orchestrator/dist/worker-event-store.js:40:                : event.ts + 10_000 * 2 ** nextRetryCount;
    packages/orchestrator/dist/worker-event-store.js:44:                status: 'failed',
    packages/orchestrator/dist/worker-event-store.js:45:                retryCount: nextRetryCount,
    packages/orchestrator/dist/worker-event-store.js:60:                status: 'verifying',
    packages/orchestrator/dist/worker-event-store.js:62:                prNumber: event.prNumber,
    packages/orchestrator/dist/worker-event-store.js:75:    if (!isWorkerEvent(message)) {
    ✓ • 0ms

## Activity

    $ node --test test/worker-events.test.mjs
    TAP version 13
    # Subtest: /home/pranav/projects/Beav/packages/orchestrator/test/worker-events.test.mjs
    not ok 1 - /home/pranav/projects/Beav/packages/orchestrator/test/worker-events.test.mjs
      ---
      duration_ms: 319.58407
      location: '/home/pranav/projects/Beav/packages/orchestrator/test/worker-events.test.mjs:1:1'
      failureType: 'testCodeFailure'
      exitCode: 1
      signal: ~
      error: 'test failed'
      code: 'ERR_TEST_FAILURE'
      ...
    1..1
    # tests 1
    # suites 0
    # pass 0
    # fail 1
    # cancelled 0
    # skipped 0
    # todo 0
    # duration_ms 326.091537
    ✗ (1) • 481ms

## Activity

    $ ./node_modules/.bin/tsc -p tsconfig.json --noEmit
    ✓ • 3.96s

## Activity

    $ ./node_modules/.bin/tsc -p tsconfig.json --noEmit
    ✓ • 4.12s

## Activity

    $ ./node_modules/.bin/tsc -p tsconfig.json --noEmit
    ✓ • 4.39s

## Activity

    $ ./node_modules/.bin/tsc -p tsconfig.json --noEmit
    ✓ • 4.48s

## Activity

    $ ./node_modules/.bin/tsc -p tsconfig.json --noEmit
    ✓ • 4.62s

## Activity

    $ node test/worker-events.test.mjs
    [worker-event-store] Received invalid worker IPC message: {"type":"failed","taskId":"task-2","error":"boom","ts":42}
    [worker-event-store] Received invalid worker IPC message: {"type":"completed","taskId":"task-3","completedAt":777}
    TAP version 13
    # Subtest: persists worker heartbeat and thread state updates
    ok 1 - persists worker heartbeat and thread state updates
      ---
      duration_ms: 1.656747
      ...
    # Subtest: persists worker failure as a log entry and failed task state
    not ok 2 - persists worker failure as a log entry and failed task state
      ---
      duration_ms: 1.443222
      location: '/home/pranav/projects/Beav/packages/orchestrator/test/worker-events.test.mjs:74:1'
      failureType: 'testCodeFailure'
      error: |-
        Expected values to be strictly equal:
    
        0 !== 2
    
      code: 'ERR_ASSERTION'
      name: 'AssertionError'
      expected: 2
      actual: 0
      operator: 'strictEqual'
      stack: |-
        TestContext.<anonymous> (file:///home/pranav/projects/Beav/packages/orchestrator/test/worker-events.test.mjs:84:10)
        async Test.run (node:internal/test_runner/test:797:9)
        async Test.processPendingSubtests (node:internal/test_runner/test:526:7)
      ...
    # Subtest: persists worker completion as verifying state cleanup
    not ok 3 - persists worker completion as verifying state cleanup
      ---
      duration_ms: 0.249925
      location: '/home/pranav/projects/Beav/packages/orchestrator/test/worker-events.test.mjs:105:1'
      failureType: 'testCodeFailure'
      error: |-
        Expected values to be strictly equal:
    
        0 !== 1
    
      code: 'ERR_ASSERTION'
      name: 'AssertionError'
      expected: 1
      actual: 0
      operator: 'strictEqual'
      stack: |-
        TestContext.<anonymous> (file:///home/pranav/projects/Beav/packages/orchestrator/test/worker-events.test.mjs:114:10)
        async Test.run (node:internal/test_runner/test:797:9)
        async Test.processPendingSubtests (node:internal/test_runner/test:526:7)
      ...
    1..3
    # tests 3
    # suites 0
    # pass 1
    # fail 2
    # cancelled 0
    # skipped 0
    # todo 0
    # duration_ms 10.380005
    ✗ (1) • 0ms

## Assistant

All five packages pass TypeScript checks. The existing event tests show one pass and two failures because their failure/completion messages omit fields now required by the validator. I also confirmed that retries restart work, successful CI still waits for a merge, and a worker that dies before its first heartbeat can remain stuck until restart.

## Activity

    $ nl -ba /home/pranav/.codex/memories/rollout_summaries/2026-10-14T14-01-20-FY0e-beav_interview_preparation_walkthrough.md | head -35 && git status --short
         1    thread_id: 01a13ab7-b545-7a30-bdf8-faf475bbff06
         2    updated_at: 2026-10-14T14:06:56+00:00
         3    rollout_path: /home/pranav/.codex/sessions/2026/10/14/rollout-2026-10-14T14-01-20-01a13ab7-b545-7a30-bdf8-faf475bbff06.jsonl
         4    cwd: /home/pranav/projects/Beav
         5    git_branch: main
         6
         7    # Interview-preparation walkthrough for Beav
         8
         9    Rollout context: The user wanted to recover an old project’s architecture and understand it well enough to defend it in interviews. The repository is `/home/pranav/projects/Beav`, a TypeScript pnpm monorepo.
        10
        11    ## Task 1: Analyze Beav and create an interview-ready walkthrough
        12
        13    Outcome: success
        14
        15    Preference signals:
        16
        17    - The user asked for a “walkthrough perfect for interview preparation,” indicating that future explanations should prioritize a coherent end-to-end story, design tradeoffs, likely interviewer follow-ups, and honest discussion of limitations rather than merely summarizing files.
        18
        19    Key steps:
        20
        21    - Inspected the monorepo structure, README, package manifests, core state/schema/configuration, orchestrator, worker, tracker, CLI, tests, and example logs.
        22    - Reconstructed the issue lifecycle: labeled GitHub issue → SQLite task → conditional claim → isolated clone → worker process → Codex app-server JSON-RPC → commit/PR → CI/merge verification.
        23    - Distinguished the two communication channels: Node IPC between orchestrator and worker, and newline-delimited JSON over stdin/stdout between worker and Codex.
        24    - Identified the five package responsibilities: `core`, `tracker`, `orchestrator`, `worker`, and `cli`.
        25    - Verified that all five packages compile using each package’s installed TypeScript compiler.
        26    - Ran the existing orchestrator worker-event tests: one passed and two failed because fixtures no longer satisfy the current event contract.
        27
        28    Failures and how to do differently:
        29
        30    - `pnpm build` could not run because `pnpm` was unavailable in the shell. Per-package `tsc` commands succeeded instead.
        31    - Worker-event tests failed because failure fixtures omitted `retryCount` and completion fixtures omitted `prNumber`/`prUrl`; validation rejected those events before persistence. Future explanations should clearly separate compilation success from test-suite failure.
        32    - The README overstates some behavior. The implementation does not provide multi-host coordination, automatic merging, a guaranteed local test gate, fully functional CLI `status`/`logs`, or universal retry handling for verification failures.
        33
        34    Reusable knowledge:
        35
    ✓ • 0ms

## Assistant

**Beav interview guide — verified against `main`, commit `ad67746`**

Your architecture is substantially implemented. Two resume phrases need qualification: **“sandboxed” means separate workspaces with path validation**, and **“atomic state transitions” accurately describes task claiming, not every lifecycle update**.

All five packages pass `tsc --noEmit`. Running the existing worker-event test file gives **one pass and two failures**: fixtures omit required fields. I inspected the implementation; I did not run a live GitHub → agent → PR workflow or benchmark contention. No repository files were modified.

---

**PART 1 — Understand Beav once**

**What it is**

Beav automates the coordination around fixing GitHub issues. A developer labels an issue; Beav schedules it, starts a coding agent, publishes changes as a pull request, and checks subsequent CI and merge status.

“Autonomous orchestrator” means it automatically coordinates these steps. **The coding agent decides which code to change; Beav manages the task’s lifecycle.**

A monorepo stores multiple related packages in one repository:

| Package | Responsibility | Internal dependencies |
|---|---|---|
| `core` | Task schema, database, configuration, state machine, workspace utilities | None |
| `tracker` | Discover issues; inspect PRs and checks | `core` |
| `orchestrator` | Schedule, claim, launch, recover tasks | `core`, `tracker` |
| `worker` | Communicate with Codex; publish changes | `core` |
| `cli` | User commands and startup | `core`, `orchestrator` |

The orchestrator locates the compiled worker entrypoint and starts it as a process; it does not call the worker as an ordinary library.

**Your 60–90-second introduction**

> “Beav is a TypeScript and Node.js automation project that takes labeled GitHub issues and coordinates an AI coding agent to produce pull requests.
>
> I separated it into five packages: shared infrastructure, GitHub tracking, orchestration, worker execution, and a command-line interface. The orchestrator polls GitHub, stores tasks in SQLite, claims pending work, and launches separate worker processes. Each worker communicates with Codex through JSON messages over standard input and output, while sending progress back to the orchestrator through Node’s process messaging channel.
>
> My main engineering focus was coordinating asynchronous work and handling failures. I implemented a seven-state lifecycle, periodic heartbeats, bounded retries, separate task workspaces, and conditional database updates for claiming tasks.
>
> The current system targets one host. Its workspaces are not container sandboxes, and retries restart execution rather than resume it. CI checks are monitored, but merging remains outside Beav.”

**Trace one task: “Fix a login validation bug”**

The central sequence is in [`tick.ts`](/home/pranav/projects/Beav/packages/orchestrator/src/tick.ts:350).

| Step | Initiator and function | Data and database effect |
|---|---|---|
| 1. Discover | Scheduler `start()` invokes `tick()`; tracker `fetchIssue()` queries GitHub | Open issues with configured label; stores title, body, repository, issue number, generated task ID, `pending` |
| 2. Claim | `dispatchTasks()` checks available capacity | Conditional update changes `pending` to `claimed`, sets `claimedAt` |
| 3. Prepare | `setupWorkspace()` spawns `git clone --depth 1` | Creates task-specific clone; saves `workspacePath` |
| 4. Launch | `launchTaskProcess()` spawns a Node worker | Serialized task passed through `BEAV_WORKER_TASK`; saves PID, `running`, `startedAt` |
| 5. Execute | Worker `run()` spawns `codex app-server` | Starts thread and turn with workspace and issue prompt; parent saves thread/turn IDs, heartbeat timestamps and logs |
| 6. Publish | Worker receives `turn/completed`; calls `createPR()` | Creates branch, commits, pushes, creates/reuses PR |
| 7. Verify | Parent persists completion; tracker `checkVerifyingTasks()` polls GitHub | Saves PR number/URL and `verifying`; failed checks can mark `failed`; merge deletes task row |

```text
CLI → Orchestrator ↔ SQLite
          │
          ├─ Tracker ↔ GitHub issues / PRs / CI checks
          │
          └─ spawn Node worker ── spawn Codex app-server
                 ↑     │              ↕
                 └ IPC ┘       JSON lines via stdin/stdout
                                      │
                                 Task Git clone
                                      │
                              git + gh → Pull request
```

Failures include GitHub authentication/rate limits, clone failure, process launch failure, agent failure, push rejection, and PR creation failure. Recovery depends on where failure occurs; it is not uniform.

---

**PART 2 — Defend Bullet 1: Architecture**

**Monorepo and boundaries**

The benefit is coordinated changes: updating a shared task/event type and its consumers happens in one commit. Separate packages still make responsibilities explicit. Separate repositories would allow independent releases, but introduce dependency versioning and cross-repository coordination.

These are **packages, not five independently deployed microservices**. Most boundaries use imports. The important process boundaries are:

- Orchestrator ↔ worker: **IPC**, meaning inter-process communication, using `process.send()` and the parent’s `message` event.
- Worker ↔ Codex: newline-delimited JSON through process streams.

**Issue discovery**

[`fetchIssue()` and `savetoDB()`](/home/pranav/projects/Beav/packages/tracker/src/github.ts:8) use Octokit’s GitHub API client. Discovery is **polling**, normally every 30 seconds, not webhooks.

Eligibility means an open issue matching the configured label, default `autofix`; confusingly, the configuration variable is `ISSUE_TITLE`. Zod validates the selected fields. A unique repository/issue constraint plus `onConflictDoNothing()` prevents duplicate task rows.

Limitations: no explicit pagination, no explicit exclusion of PR entries returned by the issues endpoint, and no analysis of whether the requested fix is feasible.

**Agent versus orchestrator**

The worker supplies the issue title/body and asks Codex to inspect files, implement a minimal fix, and run tests. Beav handles scheduling, persistence, process control and publication.

“Run tests” and “at most five tool iterations” are **prompt instructions**, not independently enforced execution gates.

**JSON-RPC and streams**

RPC means “remote procedure call”: request an operation by name and receive its result. Here “remote” is another local process.

The [`send()` helper](/home/pranav/projects/Beav/packages/worker/src/index.ts:189) emits messages like:

```json
{"method":"thread/start","id":2,"params":{"cwd":"/workspaces/task-123"}}
```

A simplified response is:

```json
{"id":2,"result":{"thread":{"id":"thread-456"}}}
```

The ID connects a response to its waiting Promise. A `pending` Map stores each request’s resolve/reject callbacks. Notifications such as `turn/completed` have a method but no request ID.

**Precision:** standard JSON-RPC 2.0 requires `"jsonrpc":"2.0"`; Beav’s serializer omits it. Say **“Codex’s JSON-RPC-style app-server protocol”**, rather than claiming strict conformance from this implementation alone. [JSON-RPC specification](https://www.jsonrpc.org/specification)

`stdin` is a process’s input stream; `stdout` is its output stream. Beav writes requests to `proc.stdin` and reads `proc.stdout`. Newlines separate messages, and `readline` assembles complete lines.

This suits a local subprocess without an HTTP listener, port or service deployment. HTTP would be appropriate for a separately hosted agent. This is a design rationale, not a documented performance comparison.

**Process management**

[`launchTaskProcess()`](/home/pranav/projects/Beav/packages/orchestrator/src/launcher.ts:29) uses asynchronous `spawn()`. The parent tracks child processes in a Map and serializes each worker’s incoming event handling through a Promise chain.

The worker handles Codex `error`/`exit` events, rejects pending RPC requests, emits failure events and attempts cleanup. It has a ten-minute timeout. Parent shutdown sends `SIGTERM`, then attempts `SIGKILL` after five seconds.

Cleanup is best-effort: abrupt killing can bypass handlers and leave descendants. Also, the success path does not set its `completed` guard before killing Codex, creating a possible completion/failure race.

**PRs and CI**

[`createPR()`](/home/pranav/projects/Beav/packages/worker/src/gitcommands.ts:46) runs:

```text
checkout branch → stage → detect changes → commit → push → gh pr create
```

The branch is `beav-fix-<taskId>`; PR base is hardcoded to `main`. It checks for an existing PR after pushing.

`checkVerifyingTasks()` gets the PR’s current head SHA and its check runs:

- Any explicit `failure` conclusion → `failed`.
- All checks successful → remain `verifying`, awaiting merge.
- No checks → await merge.
- Closed without merge → `failed`.
- Merged → delete task, rather than persist `done`.

Cancelled/timed-out checks, legacy commit statuses and required-check policy are not fully handled.

**30–45-second explanation**

> “I separated GitHub tracking, scheduling, agent execution and shared infrastructure into five TypeScript packages. The scheduler polls labeled issues and launches a worker for each claimed task. The worker starts Codex and exchanges request/response messages over stdin and stdout, matching responses by ID. It publishes changes using Git and the GitHub CLI, then the tracker polls PR checks. The implementation monitors CI and merge status, but does not automatically merge or independently guarantee that the agent ran tests.”

**Four likely follow-ups**

1. **Why five packages?**  
   “Each owns a distinct responsibility, while shared types keep their contracts consistent. A monorepo lets me update those contracts and consumers together.”

2. **How do issues arrive?**  
   “Through periodic GitHub API polling for open, labeled issues. A database uniqueness constraint prevents repeated polls from creating duplicate rows.”

3. **How do you match agent replies?**  
   “Every request gets an incrementing ID. A Map links that ID to the Promise resolved or rejected when its response arrives.”

4. **Does passing CI finish the task?**  
   “No. It remains verifying until merge; the current merge path deletes its row.”

**Challenging follow-up: “Does agent completion prove the fix works?”**

> “No. It proves the agent reported a completed turn. Beav requests tests in the prompt, but does not independently enforce a test command and successful exit before publication. I would add that gate and more complete CI-policy handling.”

---

**PART 3 — Defend Bullet 2: Reliability**

**Finite-state machine**

A finite-state machine is a fixed set of states with permitted moves between them. It prevents meaningless sequences such as `pending → done`.

[`TaskStateMachine.transitionTo()`](/home/pranav/projects/Beav/packages/core/src/state-machine.ts:6) checks an allowed-transition map and throws on an invalid move.

```text
pending → claimed → running → verifying → done
             │          │          │
             ↓          ├→ failed ←┘
           crashed ←────┘     │
             │                │
             └──→ pending ←───┘
```

| Exact state | Meaning | Allowed next states |
|---|---|---|
| `pending` | Waiting for dispatch | `claimed` |
| `claimed` | Reserved; preparing execution | `running`, `crashed` |
| `running` | Worker launched | `verifying`, `failed`, `crashed` |
| `verifying` | Awaiting PR outcome | `done`, `failed` |
| `done` | Intended terminal success | None |
| `failed` | Reported execution/verification failure | `pending` |
| `crashed` | Interrupted or unsuccessful launch/execution | `pending` |

**Important distinction:** this class is not a universal database enforcement layer. Launcher, worker-event and verification paths write statuses directly. The SQLite table also has no state-transition constraint.

**Heartbeats and crash detection**

A heartbeat is a periodic “I am still alive” message.

In worker `run()`, a timer sends one every **15 seconds** through IPC. The parent’s [`persistWorkerEvent()`](/home/pranav/projects/Beav/packages/orchestrator/src/worker-event-store.ts:8) saves its timestamp in `tasks.lastHeartbeat`.

`checkDeadTasksandUpdate()` checks `running` tasks against a default **45-second** stale threshold during scheduler ticks. It attempts to kill the stored worker PID and schedules recovery, or marks the task failed when the retry limit is reached.

A heartbeat measures responsiveness, **not useful progress**. A stuck Codex operation may coexist with a healthy worker heartbeat; the ten-minute worker timeout is a separate bound. A delayed event loop can also cause a false suspicion.

**Concrete recovery example**

Suppose a worker writes its last heartbeat at 12:00:15 and crashes:

1. A later scheduler tick sees that timestamp is more than 45 seconds old.
2. Beav attempts to kill the PID.
3. Retry count rises from zero to one.
4. Status becomes `crashed`; retry time is scheduled 20 seconds ahead.
5. A subsequent tick returns it to `pending`.
6. Dispatch creates a fresh clone and starts a new agent run.

The formula is `10_000 × 2^retryCount`, giving 20 and 40 seconds for the first two scheduled retries. At count three, the usual default paths stop scheduling: **normally three total attempts, not an initial attempt plus three retries**.

This is **restart**, not resume: saved thread/turn IDs are cleared.

Recovery limitations matter:

- A worker dying before its first heartbeat leaves `lastHeartbeat = null`; the stale check ignores it.
- Runtime stale scanning excludes `claimed` tasks.
- `recoverOnStartup()` marks all `claimed`/`running` tasks crashed without proving their processes are dead.
- CI failures do not receive `nextRetryAt`, so they do not automatically requeue.
- Worker-reported failure handling hardcodes a limit of three.

**Workspaces and path traversal**

[`setupWorkspace()`](/home/pranav/projects/Beav/packages/core/src/workspace.ts:6) creates a shallow Git clone under `<workspaceRoot>/<taskId>`. Separate clones stop normal workers from editing the same working tree.

Path traversal means using a path like `../../outside-folder` to escape the intended directory. That matters especially because setup recursively deletes the target before cloning.

The validation is:

```ts
const targetDir = path.resolve(rootDir, taskId);
const relativeTarget = path.relative(rootDir, targetDir);

if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
  throw new Error("Path traversal detected");
}
```

It rejects lexical paths escaping the root. It is not comprehensive filesystem confinement: symlinks and equal-to-root input are not fully addressed.

More fundamentally, Codex receives **`sandbox: 'danger-full-access'`**, and approval requests are automatically approved. A working directory does not stop a process accessing other files.

**Use this wording instead:** “Separate task workspaces with path-traversal validation, heartbeat-based failure detection and bounded restart retries.”

**30–45-second explanation**

> “I modeled task execution using seven states so scheduling and recovery have explicit lifecycle stages. Workers send heartbeats every fifteen seconds, and the scheduler looks for stale running tasks and retries eligible failures with increasing delays. Each task gets a separate clone, and workspace setup rejects paths escaping the configured root. Those are useful reliability controls, but they are not a security sandbox. Recovery starts a new attempt, and some crash windows still need stronger handling.”

**Four likely follow-ups**

1. **Why not ordinary status strings?**  
   “The transition map documents and checks legal moves. However, my implementation still has direct database writes that bypass it.”

2. **Does a missed heartbeat prove a crash?**  
   “No. It is a failure suspicion; scheduling delays or a blocked event loop can look similar.”

3. **Do you resume unfinished code generation?**  
   “No. Recovery clears execution identifiers and starts from a fresh clone.”

4. **Can the agent access files outside its workspace?**  
   “Yes. Workspace separation is not an OS permission boundary, and the agent runs with full access.”

**Challenging scenario: “The worker dies immediately after launch.”**

> “Before its first heartbeat, the timestamp is null and runtime stale detection misses it. The parent currently logs worker exit without directly failing the task. I would initialize liveness at launch and handle unexpected exits using an attempt-specific conditional update.”

---

**PART 4 — Defend Bullet 3: Concurrency**

**Start with the race**

“Two workers discover the same pending issue” needs a correction: **the tracker discovers issues and the orchestrator claims tasks; workers receive assigned tasks**.

Imagine two competing dispatchers. Both read task T as pending. With an unconditional update, both could set it claimed and launch workers. That is a **race condition**: correctness depends on timing.

Duplicate execution could overwrite the same task workspace, create conflicting pushes and consume agent resources twice.

**Actual parallelism**

`dispatchTasks()` launches separate Node processes, default maximum three active tasks. Claimed, running **and verifying** tasks consume capacity. Workers execute concurrently after launch, although workspace preparation is sequential.

Ordinary worker lifecycle writes go through the parent’s IPC handlers; this is not a distributed worker fleet directly consuming a shared queue.

**SQLite and WAL**

SQLite is an embedded relational database stored in files. It fits a small single-host scheduler because it offers persistent SQL data without running a database server. Drizzle supplies typed schema/query APIs; SQLite provides the database guarantees.

[`db.ts`](/home/pranav/projects/Beav/packages/core/src/db.ts:1) enables:

```sql
PRAGMA journal_mode = WAL;
```

WAL means **Write-Ahead Logging**. Imagine a reader examining task history while a writer updates a heartbeat. The writer appends changes to a log; the reader continues viewing its existing snapshot. A later checkpoint transfers committed changes into the main database.

WAL permits overlapping readers and a writer. **There is still only one writer at a time.** Competing writes may wait or fail with a busy error. Long readers can delay checkpoints, and WAL is intended for processes on the same host, not a shared network filesystem. [SQLite WAL documentation](https://www.sqlite.org/wal.html)

No inspected benchmark establishes how much contention Beav reduced.

**Atomic claiming**

Atomic means an operation happens as one indivisible database change. Beav combines the eligibility check and update:

```ts
const updatedTask = await db.update(tasks)
  .set({ status: "claimed", claimedAt: Date.now() })
  .where(and(eq(tasks.id, task.id), eq(tasks.status, "pending")))
  .returning();

if (!updatedTask[0]) continue;
```

Equivalent SQL:

```sql
UPDATE tasks
SET status = 'claimed', claimedAt = ?
WHERE id = ? AND status = 'pending'
RETURNING *;
```

This is **compare-and-swap-style**, or CAS-style: update only if the stored value still matches the expected value.

| Time | Dispatcher A | Dispatcher B |
|---|---|---|
| 1 | Reads T as pending | Reads T as pending |
| 2 | Conditional update succeeds | Attempts competing update |
| 3 | Receives updated row | After A commits, predicate no longer matches |
| 4 | Launches worker | Receives no row; skips launch |

A database busy error is another possible outcome under contention; it does not grant ownership.

**WAL enables useful overlap; the conditional predicate prevents the double claim.** These solve different problems.

**Transaction, atomicity, isolation and locking**

- **Transaction:** database work grouped into one commit or rollback.
- **Atomicity:** all of that unit succeeds, or none of it does.
- **Isolation:** rules governing what concurrent operations can observe.
- **Locking:** coordination that restricts conflicting access.

The single claim statement is atomic without an explicit application transaction. But reading candidates, claiming, cloning and launching are not one transaction. Failure-log insertion and status update are also separate writes.

**Limits and alternatives**

After a crash, heartbeat/startup recovery may retry the claim owner’s task. But there is no attempt token preventing old worker events from modifying a newer attempt.

Multiple orchestrators are unsafe overall: startup recovery can invalidate another orchestrator’s live tasks, and capacity calculation is not globally atomic. The manual `worker` command also bypasses normal claiming.

PostgreSQL would be a better direction for a shared database across hosts. Redis or a message queue could support distributed delivery, but would add infrastructure and still require retry-safe consumers and durable task-state design.

**Safer wording:** “Implemented bounded parallel workers, SQLite WAL configuration, and conditional task claiming to prevent duplicate claims in the scheduler.”

**30–45-second explanation**

> “The scheduler can run multiple worker processes while keeping task state in SQLite. I enabled WAL so reads can overlap a writer, although SQLite still serializes writers. For claiming, I use one update conditioned on the task still being pending and launch only when it returns a row. That avoids a read-then-write race. The guarantee is scoped to claiming; stronger ownership checks are still needed for retries, late events and multiple orchestrators.”

**Four likely follow-ups**

1. **Does WAL prevent duplicate work?**  
   “No. The conditional claim does. WAL concerns database access concurrency.”

2. **Can two writers write simultaneously?**  
   “SQLite allows only one writer at a time, including in WAL mode.”

3. **Why check the returned row?**  
   “It proves my update actually claimed the task. My earlier read may already be stale.”

4. **What happens after a claimant crashes?**  
   “Recovery can requeue it, subject to heartbeat gaps and retry limits. Execution restarts.”

**Difficult question: “Is execution exactly once?”**

> “No. The database claim is atomic, but GitHub publication and database persistence are separate operations. A PR might exist even if completion was never recorded. I would add attempt ownership, stale-event rejection and reconciliation of external side effects.”

---

**PART 5 — Fundamentals demonstrated by Beav**

| Concept | Simple explanation and Beav example | Likely question → answer |
|---|---|---|
| Event loop and asynchronous I/O | Node schedules callbacks while processes/network operations progress; used for RPC streams and timers | **Does async mean parallel JavaScript?** No; separate worker processes provide parallel execution |
| Promises / `async` / `await` | A Promise represents a future result; `send()` resolves on matching RPC response | **Does `await` freeze Node?** It pauses that async function; synchronous work still blocks |
| Synchronous database calls | `better-sqlite3` performs synchronous operations | **Does wrapping a query in `await` make it nonblocking?** No |
| Child processes / IPC | Processes have separate memory and exchange messages | **Why use IPC?** Structured worker events cross the process boundary without shared JavaScript objects |
| Modules and types | Packages export contracts; `WorkerEvent` describes permitted event shapes | **Are TypeScript types runtime validation?** No; `isWorkerEvent()` validates incoming messages |
| Encapsulation / OOP | `TaskStateMachine` holds status and checks transitions | **Does a class protect the database?** Only callers using it receive its checks |
| SQL concurrency | The conditional update checks and changes ownership together | **Why not select then update?** Another actor can change the row between those operations |
| Error handling / cleanup | Process events and rejected Promises trigger failure handling | **Will cleanup always run?** No; forced termination bypasses normal handlers |
| Idempotency | Repeating an action should not multiply its effects; issue insertion is deduplicated | **Are retries fully safe?** No; publication and late-event handling remain vulnerable |

Beav demonstrates backend coordination, not Express routing or a REST server. Its GitHub client consumes an external API.

---

**PART 6 — Twelve questions to rehearse, ranked**

**1. “Walk me through an issue becoming a PR.”**  
“The tracker polls labeled issues and stores pending tasks. The orchestrator conditionally claims one, creates a clone and starts a worker. The worker runs Codex, publishes changes and reports PR metadata; the tracker then monitors checks and merge status.”

**2. “How do you prevent two workers taking the same task?”**  
“The dispatcher updates only a row that is still pending. It launches only when that update returns a row. The earlier candidate read alone does not establish ownership.”

**3. “How does Node communicate with the agent?”**  
“The worker spawns Codex with piped stdin and stdout. It writes newline-separated JSON requests and matches response IDs to Promises. Worker-to-parent communication uses a separate Node IPC channel.”

**4. “What happens when a process crashes?”**  
“Codex failure can be reported by its worker. A dead worker can be detected through stale heartbeats after one has been recorded. Recovery schedules a new attempt, but the missing-first-heartbeat window is a known gap.”

**5. “What does WAL actually do?”**  
“It lets readers retain their snapshots while a writer appends changes to a log. SQLite still has one writer. It does not replace task ownership checks.”

**6. “What makes your workspaces sandboxed?”**  
“They are separate task clones with a containment check during path construction. They do not enforce process-level filesystem permissions. I should describe them as workspace isolation, because Codex runs with full access.”

**7. “Why use a state machine?”**  
“It defines legal lifecycle moves and makes recovery easier to reason about. `transitionTo()` throws for invalid moves. Some database writes bypass it, so enforcement is currently incomplete.”

**8. “Are retries idempotent?”**  
“Repeated issue ingestion is deduplicated, and PR creation checks for an existing branch PR. That is partial protection. A crash between pushing, publishing and saving completion can leave external state that a retry must reconcile.”

**9. “Why SQLite instead of PostgreSQL?”**  
“For a small single-host scheduler, SQLite avoids a separate database service. Task-state writes are short compared with agent execution. I would reconsider it when deployment needs multiple hosts or substantially more concurrent writes.”

**10. “Does async/await make everything nonblocking?”**  
“No; it makes Promise-based control flow easier to express. Child-process and network operations can progress while JavaScript waits. Synchronous database operations still occupy the event-loop thread.”

**11. “How do you know the fix passed?”**  
“Beav asks the agent to run tests and later polls GitHub check runs. It does not enforce an independent local test gate. Successful checks leave the task verifying until a merge is observed.”

**12. “What would you improve first?”**  
“I would add an attempt identifier to claims and worker events, rejecting updates from outdated attempts. Then I would close the launch/heartbeat crash gap and reconcile published branches and PRs before retrying. I would also fix the event tests and add actual competing-claim and crash-recovery tests.”

---

**PART 7 — Five-minute revision sheet**

**Introduction to rehearse**

> “Beav is a TypeScript and Node.js project that turns labeled GitHub issues into AI-generated pull requests. It separates shared infrastructure, GitHub tracking, scheduling, worker execution and CLI commands into five packages.
>
> The orchestrator polls issues, persists tasks in SQLite and conditionally claims work. It creates a separate clone and starts a worker, which communicates with Codex through JSON messages over stdin and stdout. Worker progress returns through Node IPC.
>
> I focused on coordinating asynchronous execution: a seven-state lifecycle, heartbeats, bounded retries and conditional task claiming. Git and the GitHub CLI publish the changes, and the tracker monitors CI and merge status.
>
> Its scope is one host. Workspaces are not security sandboxes, retries restart work, and the implementation does not guarantee exactly-once execution or passing tests before publication.”

**Lifecycle**

```text
Labeled issue → pending → claimed → clone → running agent
→ commit/push/PR → verifying → human merge → task deleted
```

**Three points per bullet**

| Bullet | Remember |
|---|---|
| Architecture | Five responsibility-based packages; two process communication channels; polling and PR/check automation |
| Reliability | Seven declared states; 15-second heartbeats and bounded restart retries; path validation without OS sandboxing |
| Concurrency | Separate worker processes; WAL reader/writer overlap; conditional claim plus returned-row check |

**Seven exact states**

`pending`, `claimed`, `running`, `verifying`, `done`, `failed`, `crashed`.

**Mechanisms to remember**

- **RPC:** method + parameters + ID; matching response resolves a Promise; notifications lack IDs. Beav omits the standard `jsonrpc` version field.
- **Heartbeat:** worker sends; parent persists; scheduler checks. Defaults: 15-second emission, 45-second stale threshold, 30-second polling.
- **Recovery:** fresh attempt, normally 20/40-second retry delays; no automatic resume.
- **WAL:** readers can overlap one writer; not multiple simultaneous writers.
- **Claim:** `UPDATE … WHERE id = ? AND status = 'pending' RETURNING *`.
- **CI:** successful checks wait for merge; merged tasks are deleted.

**Five dangerous overclaims**

1. “The agent is securely sandboxed.”
2. “WAL permits multiple simultaneous writers or prevents duplicate execution.”
3. “Every lifecycle transition is guarded and atomic.”
4. “Every crash is detected and retries resume safely.”
5. “Agent completion or PR creation proves tests passed.”

**Five questions you must answer**

1. Which process does what, and how do they communicate?
2. Why does conditional claiming stop the two-claimant race?
3. What happens after a crash, including before the first heartbeat?
4. What does WAL permit, and what does it not permit?
5. What security and correctness guarantees are actually missing?
