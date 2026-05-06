import * as schema from './schema.js';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// create beav.db file in root
const sqlite = new Database('beav.db');
sqlite.exec('PRAGMA journal_mode = WAL;');
const hasTasksTable = sqlite
  .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
  .get('tasks');

if (hasTasksTable) {
  sqlite.exec('CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);');
}

export const db = drizzle(sqlite, { schema });
