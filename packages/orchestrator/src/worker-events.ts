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
