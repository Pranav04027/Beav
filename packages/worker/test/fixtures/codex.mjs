#!/usr/bin/env node
// Deterministic protocol peer for tests; the real agent client still uses pipes.
import readline from 'node:readline';
const mode =
  (process.argv[2] === 'app-server' ? undefined : process.argv[2]) ??
  process.env.BEAV_TEST_AGENT_MODE ??
  'success';
const input = readline.createInterface({ input: process.stdin });
const send = (messages) => {
  const payload = messages
    .map((message) => JSON.stringify(message) + '\n')
    .join('');
  // Exercise framing across chunks and multiple messages in one chunk.
  process.stdout.write(payload.slice(0, 7));
  setTimeout(
    () =>
      process.stdout.write(payload.slice(7), () => {
        if (
          mode === 'complete-exit' &&
          messages.some((message) => message.method === 'turn/completed')
        )
          process.exit(0);
      }),
    2,
  );
};
let initializeId;
let approvals = 0;
input.on('line', (line) => {
  const message = JSON.parse(line);
  if (!message.method && [900, 901, 902].includes(message.id)) {
    if (message.id !== 902 && message.result?.approved !== true)
      process.exit(31);
    approvals++;
    if (approvals === 3) send([{ id: initializeId, result: {} }]);
    return;
  }
  if (message.method === 'initialize') {
    if (mode === 'rpc-error') {
      send([{ id: message.id, error: { message: 'initialization rejected' } }]);
      return;
    }
    initializeId = message.id;
    send([
      { id: 900, method: 'item/commandExecution/requestApproval', params: {} },
      { id: 901, method: 'item/fileChange/requestApproval', params: {} },
      { id: 902, method: 'unknown/testRequest', params: {} },
    ]);
  }
  if (message.method === 'thread/start')
    send([{ id: message.id, result: { thread: { id: 'thread-1' } } }]);
  if (message.method === 'turn/start') {
    if (mode === 'exit') {
      process.exit(17);
    }
    const reply = { id: message.id, result: { turn: { id: 'turn-1' } } };
    if (mode === 'hang') {
      send([reply]);
      return;
    }
    const complete = {
      method: 'turn/completed',
      params: {
        threadId: 'thread-1',
        turn: {
          id: 'turn-1',
          status:
            mode === 'failed'
              ? 'failed'
              : mode === 'cancelled'
                ? 'interrupted'
                : 'completed',
        },
      },
    };
    const delta = {
      method: 'item/agentMessage/delta',
      params: { delta: 'working' },
    };
    const wrongTurn = {
      method: 'turn/completed',
      params: {
        threadId: 'thread-1',
        turn: { id: 'another-turn', status: 'failed' },
      },
    };
    send(
      mode === 'early'
        ? [delta, complete, reply]
        : [reply, delta, wrongTurn, complete, complete],
    );
  }
});
