import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_PATH = resolve(process.cwd(), "db", "health.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("foreign_keys = ON");

// Idempotent schema bootstrap. We don't use drizzle-kit migrations for this single-user app —
// just create-if-not-exists at startup. Same shape as schema.ts.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS hr_samples (
    id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    value REAL NOT NULL,
    kind TEXT NOT NULL DEFAULT 'avg',
    source TEXT,
    ingested_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS hr_ts_idx ON hr_samples(ts);

  CREATE TABLE IF NOT EXISTS sleep_sessions (
    night_date TEXT PRIMARY KEY,
    sleep_start INTEGER NOT NULL,
    sleep_end INTEGER NOT NULL,
    in_bed_start INTEGER,
    in_bed_end INTEGER,
    total_minutes REAL NOT NULL,
    deep_minutes REAL NOT NULL DEFAULT 0,
    rem_minutes REAL NOT NULL DEFAULT 0,
    core_minutes REAL NOT NULL DEFAULT 0,
    awake_minutes REAL NOT NULL DEFAULT 0,
    source TEXT,
    ingested_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS nightly_hr_stats (
    night_date TEXT PRIMARY KEY,
    min_hr REAL,
    p5_hr REAL,
    avg_hr REAL,
    max_hr REAL,
    sample_count INTEGER NOT NULL,
    computed_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_steps (
    date TEXT PRIMARY KEY,
    steps REAL NOT NULL,
    source TEXT,
    ingested_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resting_hr (
    date TEXT PRIMARY KEY,
    value REAL NOT NULL,
    source TEXT,
    ingested_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS hrv_samples (
    date TEXT PRIMARY KEY,
    value REAL NOT NULL,
    source TEXT,
    ingested_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vo2_max_samples (
    date TEXT PRIMARY KEY,
    value REAL NOT NULL,
    source TEXT,
    ingested_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS weight_samples (
    date TEXT PRIMARY KEY,
    value REAL NOT NULL,
    source TEXT,
    ingested_at INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };
