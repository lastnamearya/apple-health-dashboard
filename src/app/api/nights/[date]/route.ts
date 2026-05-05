import { NextResponse } from "next/server";
import { sqlite } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;

  const session = sqlite
    .prepare(
      `SELECT night_date AS nightDate, sleep_start AS sleepStart, sleep_end AS sleepEnd,
              total_minutes AS totalMinutes, deep_minutes AS deepMinutes,
              rem_minutes AS remMinutes, core_minutes AS coreMinutes, awake_minutes AS awakeMinutes
       FROM sleep_sessions WHERE night_date = ?`,
    )
    .get(date) as any;

  if (!session) {
    return NextResponse.json({ error: "Night not found" }, { status: 404 });
  }

  const stats = sqlite
    .prepare(
      `SELECT min_hr AS minHr, p5_hr AS p5Hr, avg_hr AS avgHr, max_hr AS maxHr, sample_count AS sampleCount
       FROM nightly_hr_stats WHERE night_date = ?`,
    )
    .get(date) as any;

  // Pull all HR samples within the sleep window (we want min/avg/max series for the chart)
  const samples = sqlite
    .prepare(
      `SELECT ts, value, kind FROM hr_samples
       WHERE ts BETWEEN ? AND ?
       ORDER BY ts ASC`,
    )
    .all(session.sleepStart, session.sleepEnd) as Array<{
    ts: number;
    value: number;
    kind: string;
  }>;

  return NextResponse.json({ session, stats, samples });
}
