#!/usr/bin/env node
import { applicationPaths, loadEnvironment } from '@beav/core/config';
import { openDatabase } from '@beav/core/db';
import { createTaskStore } from '@beav/core/task-store';

async function main() {
  const command = process.argv[2]?.trim().toLowerCase();
  const argument = process.argv[3];
  if (command === 'setup') {
    const { setup } = await import('./setup.js');
    await setup();
    return;
  }
  if (command === 'start') {
    const { start } = await import('@beav/orchestrator');
    await start();
    return;
  }
  if (command === 'worker') {
    if (!argument) throw new Error('Usage: beav worker <taskId>');
    const { startTask } = await import('@beav/orchestrator/manual');
    await startTask(argument);
    return;
  }
  if (command === 'status' || command === 'logs') {
    loadEnvironment();
    const connection = openDatabase(applicationPaths().databasePath);
    try {
      const store = createTaskStore(connection.database);
      if (command === 'status')
        console.table(
          store.list().map((task) => ({
            id: task.id,
            issue: task.githubIssueNumber,
            status: task.status,
            retries: task.retryCount,
            pr: task.prURL,
          })),
        );
      else
        for (const entry of store.logs(argument)) {
          console.log(
            new Date(entry.ts ?? 0).toISOString(),
            entry.taskId,
            entry.stream,
            entry.line,
          );
        }
    } finally {
      connection.close();
    }
    return;
  }
  console.log('Usage: beav <setup|start|status|logs [taskId]|worker taskId>');
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
