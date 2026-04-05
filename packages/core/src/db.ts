import * as schema from "./schema.js"
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';


// create beav.db file in root
const sqlite = new Database('beav.db');

export const db = drizzle(sqlite, { schema });