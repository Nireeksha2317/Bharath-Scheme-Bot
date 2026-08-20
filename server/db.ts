import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Remove 'file:' prefix if present for better-sqlite3 constructor
const dbPath = process.env.DATABASE_URL.replace('file:', '');
const sqlite = new Database(dbPath);

// Production SQLite Optimizations
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
