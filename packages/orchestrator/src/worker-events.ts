import { db } from '@beav/core/db';
import {
  handleWorkerMessage as handleWorkerMessageWithDatabase,
  persistWorkerEvent as persistWorkerEventWithDatabase,
} from './worker-event-store.js';
import type { WorkerEvent } from '@beav/core/worker-events';

export async function persistWorkerEvent(event: WorkerEvent, database: any = db) {
  await persistWorkerEventWithDatabase(event, database);
}

export async function handleWorkerMessage(message: unknown, database: any = db) {
  await handleWorkerMessageWithDatabase(message, database);
}
