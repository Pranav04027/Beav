import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import readline from 'node:readline';
import type { AssignedTask } from '@beav/core/worker-events';
import * as logger from '@beav/core/logger';

interface AgentOptions {
  signal: AbortSignal;
  onProgress: (text: string) => void | Promise<void>;
  onThread: (threadId: string, turnId: string) => void | Promise<void>;
}

export function createAgentClient(
  startProcess: () => ChildProcessWithoutNullStreams = () =>
    spawn('codex', ['app-server'], { stdio: 'pipe' }),
) {
  let proc: ChildProcessWithoutNullStreams | undefined;
  let closing: Promise<void> | undefined;
  let expectedExit = false;
  let used = false;
  let processClosed: Promise<void> = Promise.resolve();
  let nextId = 0;
  const pending = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();

  async function fixIssue(task: AssignedTask, options: AgentOptions) {
    if (used) throw new Error('An agent client handles one task attempt');
    used = true;
    options.signal.throwIfAborted();
    const child = (proc = startProcess());
    processClosed = new Promise((resolve) =>
      child.once('close', () => resolve()),
    );
    let settled = false;
    let failure: Error | undefined;
    let activeTurn: string | undefined;
    let activeThread: string | undefined;
    const earlyCompletions: any[] = [];
    let resolveCompletion!: () => void;
    let rejectCompletion!: (error: Error) => void;
    const completion = new Promise<void>((resolve, reject) => {
      resolveCompletion = resolve;
      rejectCompletion = reject;
    });
    // Completion can fail while initialization is still awaiting an RPC reply.
    void completion.catch(() => {});
    const fail = (error: Error) => {
      failure ??= error;
      for (const request of pending.values()) request.reject(error);
      pending.clear();
      if (!settled) {
        settled = true;
        rejectCompletion(error);
      }
    };
    const abort = () =>
      fail(
        options.signal.reason instanceof Error
          ? options.signal.reason
          : new Error('Agent aborted'),
      );
    options.signal.addEventListener('abort', abort, { once: true });

    const write = (message: unknown) => {
      child.stdin.write(JSON.stringify(message) + '\n', (error) => {
        if (error && !expectedExit) fail(error);
      });
    };
    const request = (method: string, params: unknown): Promise<any> => {
      options.signal.throwIfAborted();
      if (failure) return Promise.reject(failure);
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        write({ method, id, params });
      });
    };
    const acceptCompletion = (params: any) => {
      if (settled) return;
      if (typeof activeTurn !== 'string' || !activeTurn) {
        earlyCompletions.push(params);
        return;
      }
      if (params?.threadId && params.threadId !== activeThread) return;
      if (params?.turn?.id && params.turn.id !== activeTurn) return;
      if (params?.turn?.status !== 'completed') {
        fail(
          new Error(
            'Agent turn ended with status: ' + String(params?.turn?.status),
          ),
        );
      } else {
        settled = true;
        resolveCompletion();
      }
    };

    const stdout = readline.createInterface({ input: child.stdout });
    const stderr = readline.createInterface({ input: child.stderr });
    stderr.on('line', (line) => {
      if (line.trim()) logger.error('codex', line);
    });
    stdout.on('line', (line) => {
      if (process.env.DEBUG_CODEX_RAW === '1')
        process.stderr.write('[CODEX RAW] ' + line + '\n');
      let message: any;
      try {
        message = JSON.parse(line);
      } catch {
        logger.warn('codex', 'Ignoring malformed protocol line');
        return;
      }
      if (!message || typeof message !== 'object') return;
      try {
        if (message.id !== undefined && typeof message.method === 'string') {
          // These are Codex server requests, separate from worker-to-parent IPC.
          const approval =
            message.method === 'item/commandExecution/requestApproval' ||
            message.method === 'item/fileChange/requestApproval';
          if (!approval)
            logger.warn('codex', 'Unknown server request: ' + message.method);
          write({ id: message.id, result: approval ? { approved: true } : {} });
        } else if (message.id !== undefined) {
          const responder = pending.get(message.id);
          if (!responder) return;
          pending.delete(message.id);
          if (message.error)
            responder.reject(
              new Error(String(message.error.message ?? 'Agent RPC error')),
            );
          else responder.resolve(message.result);
        } else if (message.method === 'turn/completed') {
          acceptCompletion(message.params);
        } else if (message.method === 'item/agentMessage/delta' && !settled) {
          const delta = message.params?.delta;
          if (typeof delta === 'string' && delta.trim()) {
            void Promise.resolve(options.onProgress(delta)).catch((error) =>
              fail(new Error(String(error))),
            );
          }
        }
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    });
    child.stdin.on('error', fail);
    child.once('error', fail);
    // Wait for stdout to drain before deciding a clean final notification was missing.
    child.once('close', (code, signal) => {
      if (!expectedExit)
        fail(
          new Error('Codex exited (code=' + code + ', signal=' + signal + ')'),
        );
    });

    try {
      await request('initialize', {
        clientInfo: { name: 'beav-worker', version: '1.0.0' },
      });
      write({ method: 'initialized', params: {} });
      const thread = await request('thread/start', {
        model: 'gpt-5.4',
        cwd: task.workspacePath,
        approval_policy: 'never',
        sandbox: 'danger-full-access',
      });
      activeThread = thread?.thread?.id;
      if (typeof activeThread !== 'string' || !activeThread)
        throw new Error('thread/start did not return thread.id');
      const turn = await request('turn/start', {
        threadId: activeThread,
        input: [
          {
            type: 'text',
            text: [
              'Fix the GitHub issue below. Work directly in this workspace.',
              'Make minimal, correct changes. Run the relevant tests in non-watch mode.',
              'Do not push changes or create a pull request; Beav handles publication.',
              'Do not ask for approval. Use at most five tool-use iterations, then stop and explain any remaining issue.',
              'Title: ' + task.issueTitle,
              'Body: ' + (task.body ?? ''),
            ].join('\n\n'),
          },
        ],
      });
      activeTurn = turn?.turn?.id;
      if (typeof activeTurn !== 'string' || !activeTurn)
        throw new Error('turn/start did not return turn.id');
      await options.onThread(activeThread, activeTurn);
      for (const params of earlyCompletions) acceptCompletion(params);
      await completion;
    } finally {
      options.signal.removeEventListener('abort', abort);
      stdout.close();
      stderr.close();
    }
  }

  function close() {
    closing ??= (async () => {
      expectedExit = true;
      if (!proc) return;
      if (!proc.pid || proc.exitCode !== null || proc.signalCode !== null) {
        await processClosed;
        return;
      }
      const child = proc;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => child.kill('SIGKILL'), 1000);
        void processClosed.then(() => {
          clearTimeout(timer);
          resolve();
        });
        child.kill('SIGTERM');
      });
    })();
    return closing;
  }
  return { fixIssue, close };
}
export type AgentClient = ReturnType<typeof createAgentClient>;
