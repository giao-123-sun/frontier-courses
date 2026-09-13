import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
export function openDatabase(
  path = process.env.DATABASE_PATH || "private/subscribers.db",
) {
  if (path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, topics TEXT NOT NULL, confirmed INTEGER NOT NULL DEFAULT 0, confirm_hash TEXT, confirm_expires TEXT, unsubscribe_hash TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_sent TEXT, last_requested TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS deliveries (email TEXT NOT NULL, resource_id TEXT NOT NULL, version TEXT NOT NULL, sent_at TEXT NOT NULL, PRIMARY KEY(email,resource_id,version));
 CREATE TABLE IF NOT EXISTS unsubscribe_links (hash TEXT PRIMARY KEY, email TEXT NOT NULL);`);
  return db;
}
