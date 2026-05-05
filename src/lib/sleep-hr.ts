import { sqlite } from "@/db/client";

export type NightlyStats = {
  nightDate: string;
  minHr: number | null;
  p5Hr: number | null;
  avgHr: number | null;
  maxHr: number | null;
  sampleCount: number;
};

/**
 * For each sleep session, find HR samples whose timestamps fall inside the
 * sleep window and compute min/p5/avg/max. Uses the "min" kind when available
 * (those are the truest lows of small buckets), falling back to "avg".
 */
export function computeNightlyStats(): NightlyStats[] {
  const sessions = sqlite
    .prepare(
      `SELECT night_date, sleep_start, sleep_end FROM sleep_sessions ORDER BY night_date`,
    )
    .all() as Array<{ night_date: string; sleep_start: number; sleep_end: number }>;

  const results: NightlyStats[] = [];

  const sampleStmt = sqlite.prepare(
    `SELECT value, kind FROM hr_samples
     WHERE ts BETWEEN ? AND ?
     ORDER BY value ASC`,
  );

  for (const sess of sessions) {
    const samples = sampleStmt.all(sess.sleep_start, sess.sleep_end) as Array<{
      value: number;
      kind: string;
    }>;
    if (samples.length === 0) {
      results.push({
        nightDate: sess.night_date,
        minHr: null,
        p5Hr: null,
        avgHr: null,
        maxHr: null,
        sampleCount: 0,
      });
      continue;
    }
    // Prefer "min" kind for the floor of the night; fall back to "avg" if no mins
    const mins = samples.filter((s) => s.kind === "min").map((s) => s.value);
    const avgs = samples.filter((s) => s.kind === "avg").map((s) => s.value);
    const maxes = samples.filter((s) => s.kind === "max").map((s) => s.value);
    const baseForLow = mins.length ? mins : avgs;
    const baseForHigh = maxes.length ? maxes : avgs;
    const baseForMean = avgs.length ? avgs : samples.map((s) => s.value);

    const sortedLow = [...baseForLow].sort((a, b) => a - b);
    const minHr = sortedLow[0] ?? null;
    const p5Idx = Math.max(0, Math.floor(sortedLow.length * 0.05));
    const p5Hr = sortedLow[p5Idx] ?? null;
    const maxHr = baseForHigh.length
      ? Math.max(...baseForHigh)
      : null;
    const avgHr =
      baseForMean.length > 0
        ? baseForMean.reduce((a, v) => a + v, 0) / baseForMean.length
        : null;

    results.push({
      nightDate: sess.night_date,
      minHr,
      p5Hr,
      avgHr,
      maxHr,
      sampleCount: samples.length,
    });
  }
  return results;
}

export function refreshNightlyStatsTable() {
  const now = Date.now();
  const stats = computeNightlyStats();
  const upsert = sqlite.prepare(
    `INSERT INTO nightly_hr_stats (night_date, min_hr, p5_hr, avg_hr, max_hr, sample_count, computed_at)
     VALUES (@nightDate, @minHr, @p5Hr, @avgHr, @maxHr, @sampleCount, @computedAt)
     ON CONFLICT(night_date) DO UPDATE SET
       min_hr=excluded.min_hr,
       p5_hr=excluded.p5_hr,
       avg_hr=excluded.avg_hr,
       max_hr=excluded.max_hr,
       sample_count=excluded.sample_count,
       computed_at=excluded.computed_at`,
  );
  const tx = sqlite.transaction((rows: NightlyStats[]) => {
    for (const r of rows) {
      upsert.run({ ...r, computedAt: now });
    }
  });
  tx(stats);
  return stats.length;
}
