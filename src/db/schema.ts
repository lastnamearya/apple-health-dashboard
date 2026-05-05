import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";

/**
 * Every individual heart rate sample from HealthKit.
 * id is a deterministic hash of (timestamp + value + source) so re-imports dedupe.
 */
export const hrSamples = sqliteTable(
  "hr_samples",
  {
    id: text("id").primaryKey(),
    /** Unix epoch ms */
    ts: integer("ts").notNull(),
    /** beats per minute. From Auto Export this may be Avg of a small bucket; we store as a single value. */
    value: real("value").notNull(),
    /** "min" | "avg" | "max" — which field of the source bucket this came from */
    kind: text("kind").notNull().default("avg"),
    source: text("source"),
    ingestedAt: integer("ingested_at").notNull(),
  },
  (t) => ({
    tsIdx: index("hr_ts_idx").on(t.ts),
  }),
);

/**
 * One row per night. Comes from Auto Export's pre-grouped sleep_analysis sessions.
 * Stage durations are stored in MINUTES (Auto Export gives hours; we convert on ingest).
 */
export const sleepSessions = sqliteTable(
  "sleep_sessions",
  {
    /** "YYYY-MM-DD" of the night-end (the wake-up date), as the canonical key */
    nightDate: text("night_date").primaryKey(),
    sleepStart: integer("sleep_start").notNull(), // unix ms
    sleepEnd: integer("sleep_end").notNull(),
    inBedStart: integer("in_bed_start"),
    inBedEnd: integer("in_bed_end"),
    totalMinutes: real("total_minutes").notNull(),
    deepMinutes: real("deep_minutes").notNull().default(0),
    remMinutes: real("rem_minutes").notNull().default(0),
    coreMinutes: real("core_minutes").notNull().default(0),
    awakeMinutes: real("awake_minutes").notNull().default(0),
    source: text("source"),
    ingestedAt: integer("ingested_at").notNull(),
  },
);

/**
 * Computed once per ingest — minimum/average HR within each sleep window.
 * Lets the dashboard query a tiny table instead of joining thousands of HR samples.
 */
export const nightlyHrStats = sqliteTable("nightly_hr_stats", {
  nightDate: text("night_date").primaryKey(),
  minHr: real("min_hr"),
  p5Hr: real("p5_hr"),
  avgHr: real("avg_hr"),
  maxHr: real("max_hr"),
  sampleCount: integer("sample_count").notNull(),
  computedAt: integer("computed_at").notNull(),
});
