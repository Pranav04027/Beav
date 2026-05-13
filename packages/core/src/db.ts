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
