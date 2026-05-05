import { NextResponse } from "next/server";
import { sqlite } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  // Latest night
  const latest = sqlite
    .prepare(
      `SELECT s.night_date, s.sleep_start, s.sleep_end, s.total_minutes, s.deep_minutes, s.rem_minutes, s.core_minutes, s.awake_minutes,
              h.min_hr, h.p5_hr, h.avg_hr, h.max_hr, h.sample_count
       FROM sleep_sessions s
       LEFT JOIN nightly_hr_stats h ON h.night_date = s.night_date
       ORDER BY s.night_date DESC
       LIMIT 1`,
    )
    .get() as any;

  // Baselines: last 7 days, last 30 days
  const baselines = sqlite
    .prepare(
      `SELECT
         AVG(CASE WHEN rn <= 7  THEN min_hr END) AS min7,
         AVG(CASE WHEN rn <= 30 THEN min_hr END) AS min30,
         AVG(CASE WHEN rn <= 7  THEN avg_hr END) AS avg7,
         AVG(CASE WHEN rn <= 30 THEN avg_hr END) AS avg30
       FROM (
         SELECT min_hr, avg_hr,
                ROW_NUMBER() OVER (ORDER BY night_date DESC) AS rn
         FROM nightly_hr_stats
         WHERE sample_count > 0
       )`,
    )
    .get() as any;

  const totalNights =
    (sqlite.prepare(`SELECT COUNT(*) AS c FROM sleep_sessions`).get() as any)
      ?.c ?? 0;
  const totalSamples =
    (sqlite.prepare(`SELECT COUNT(*) AS c FROM hr_samples`).get() as any)?.c ??
    0;

  return NextResponse.json({
    latest,
    baselines,
    totals: { nights: totalNights, hrSamples: totalSamples },
  });
}
