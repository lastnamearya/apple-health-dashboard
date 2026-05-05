import { NextResponse } from "next/server";
import { sqlite } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = sqlite
    .prepare(
      `SELECT s.night_date AS nightDate,
              s.total_minutes AS totalMinutes,
              s.deep_minutes AS deepMinutes,
              s.rem_minutes AS remMinutes,
              h.min_hr AS minHr,
              h.p5_hr AS p5Hr,
              h.avg_hr AS avgHr,
              h.max_hr AS maxHr,
              h.sample_count AS sampleCount
       FROM sleep_sessions s
       LEFT JOIN nightly_hr_stats h ON h.night_date = s.night_date
       ORDER BY s.night_date ASC`,
    )
    .all();

  // 7-day rolling average for min and avg HR
  const withRolling = rows.map((r: any, i, arr: any[]) => {
    const window = arr.slice(Math.max(0, i - 6), i + 1).filter((x) => x.minHr != null);
    const minRoll =
      window.length > 0
        ? window.reduce((s, x) => s + x.minHr, 0) / window.length
        : null;
    const avgRoll =
      window.length > 0
        ? window.reduce((s, x) => s + x.avgHr, 0) / window.length
        : null;
    return { ...r, minRoll, avgRoll };
  });

  return NextResponse.json({ rows: withRolling });
}
