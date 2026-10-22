import { loadConfig, loadEnvironment } from '@beav/core/config';
import { openDatabase } from '@beav/core/db';
import { createTaskStore } from '@beav/core/task-store';
import { prepareWorkspace, removeWorkspace } from '@beav/core/workspace';
import { createWorkerManager } from './launcher.js';
import { recordExecutionFailure } from './retries.js';

// The explicit CLI worker command uses the same claim and launch path.
export async function startTask(id: string) {
  loadEnvironment();
  const config = loadConfig();
  const connection = openDatabase(config.databasePath);
  const store = createTaskStore(connection.database);
  const workers = createWorkerManager(store, config.workspaceRoot);
  const task = store.claimPendingTask(id);
  if (!task) {
    connection.close();
    throw new Error('Task must be pending and unclaimed: ' + id);
  }
  const controller = new AbortController();
  const stop = () => {
    controller.abort(new Error('Manual worker is stopping'));
    void workers.stopAll();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    const directory = await prepareWorkspace(
      task.id,
      task.repoOwner,
      task.repoName,
      config.workspaceRoot,
      controller.signal,
    );
    controller.signal.throwIfAborted();
    const prepared = store.setWorkspace(task, directory);
    if (!prepared) throw new Error('Task claim lost');
    const pid = await workers.launch(prepared);
    console.log('Launched worker ' + pid + ' for task ' + id);
    await workers.wait(id);
  } catch (error) {
    recordExecutionFailure(store, task, 'launch', String(error));
    await removeWorkspace(task.id, config.workspaceRoot);
    throw error;
  } finally {
    await workers.stopAll();
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    connection.close();
  }
}
