/**
 * Ingest all JSON files in data/inbox/ into SQLite, then move them to data/archive/.
 *
 * Usage:
 *   pnpm ingest                      # process everything in inbox
 *   pnpm ingest path/to/file.json    # process a single file (does not move it)
 */
import { readFileSync, readdirSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { sqlite } from "@/db/client";
import { parseHrSamples, parseSleepSessions } from "@/lib/parser";
import { refreshNightlyStatsTable } from "@/lib/sleep-hr";

const ROOT = process.cwd();
const INBOX = resolve(ROOT, "data", "inbox");
const ARCHIVE = resolve(ROOT, "data", "archive");
mkdirSync(INBOX, { recursive: true });
mkdirSync(ARCHIVE, { recursive: true });

function ingestFile(path: string) {
  const t0 = Date.now();
  const sizeMB = (
    require("node:fs").statSync(path).size /
    1024 /
    1024
  ).toFixed(1);
  console.log(`\n→ ${basename(path)} (${sizeMB} MB)`);

  const raw = JSON.parse(readFileSync(path, "utf8"));

  const hr = parseHrSamples(raw);
  const sleep = parseSleepSessions(raw);

  const insertHr = sqlite.prepare(
    `INSERT OR IGNORE INTO hr_samples (id, ts, value, kind, source, ingested_at)
     VALUES (@id, @ts, @value, @kind, @source, @ingestedAt)`,
  );
  const upsertSleep = sqlite.prepare(
    `INSERT INTO sleep_sessions (
       night_date, sleep_start, sleep_end, in_bed_start, in_bed_end,
       total_minutes, deep_minutes, rem_minutes, core_minutes, awake_minutes,
       source, ingested_at
     ) VALUES (
       @nightDate, @sleepStart, @sleepEnd, @inBedStart, @inBedEnd,
       @totalMinutes, @deepMinutes, @remMinutes, @coreMinutes, @awakeMinutes,
       @source, @ingestedAt
     )
     ON CONFLICT(night_date) DO UPDATE SET
       sleep_start=excluded.sleep_start,
       sleep_end=excluded.sleep_end,
       in_bed_start=excluded.in_bed_start,
       in_bed_end=excluded.in_bed_end,
       total_minutes=excluded.total_minutes,
       deep_minutes=excluded.deep_minutes,
       rem_minutes=excluded.rem_minutes,
       core_minutes=excluded.core_minutes,
       awake_minutes=excluded.awake_minutes,
       source=excluded.source,
       ingested_at=excluded.ingested_at`,
  );

  const tx = sqlite.transaction(() => {
    let inserted = 0;
    for (const row of hr) {
      const r = insertHr.run(row);
      if (r.changes > 0) inserted++;
    }
    for (const row of sleep) {
      upsertSleep.run(row);
    }
    return inserted;
  });

  const newHr = tx();
  console.log(
    `  HR samples:    ${hr.length.toLocaleString()} parsed, ${newHr.toLocaleString()} new`,
  );
  console.log(`  Sleep nights:  ${sleep.length} (upserted)`);
  console.log(`  Time:          ${Date.now() - t0} ms`);
}

function main() {
  const argFile = process.argv[2];
  if (argFile) {
    if (!existsSync(argFile)) {
      console.error(`File not found: ${argFile}`);
      process.exit(1);
    }
    ingestFile(resolve(argFile));
  } else {
    const files = readdirSync(INBOX).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
      console.log(`No .json files in ${INBOX}`);
      console.log(`Drop your Auto Export files there and run \`pnpm ingest\` again.`);
      return;
    }
    for (const f of files) {
      const src = resolve(INBOX, f);
      ingestFile(src);
      const dest = resolve(ARCHIVE, f);
      renameSync(src, dest);
      console.log(`  Archived to:   ${dest}`);
    }
  }

  console.log("\n→ Refreshing nightly HR stats…");
  const n = refreshNightlyStatsTable();
  console.log(`  ${n} nights computed.\n`);

  // Summary
  const sleepCount = (
    sqlite.prepare(`SELECT COUNT(*) as c FROM sleep_sessions`).get() as {
      c: number;
    }
  ).c;
  const hrCount = (
    sqlite.prepare(`SELECT COUNT(*) as c FROM hr_samples`).get() as { c: number }
  ).c;
  console.log("──────────────────────────────────────────");
  console.log(`Database now contains:`);
  console.log(`  ${sleepCount} sleep sessions`);
  console.log(`  ${hrCount.toLocaleString()} HR samples`);
  console.log("──────────────────────────────────────────\n");
}

main();
