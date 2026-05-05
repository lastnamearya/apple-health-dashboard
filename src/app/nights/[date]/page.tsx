import { sqlite } from "@/db/client";
import { NightChart } from "@/components/NightChart";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function fmtTime(ms: number) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default async function NightPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  const session = sqlite
    .prepare(
      `SELECT night_date AS nightDate, sleep_start AS sleepStart, sleep_end AS sleepEnd,
              total_minutes AS totalMinutes, deep_minutes AS deepMinutes,
              rem_minutes AS remMinutes, core_minutes AS coreMinutes, awake_minutes AS awakeMinutes
       FROM sleep_sessions WHERE night_date = ?`,
    )
    .get(date) as any;

  if (!session) notFound();

  const stats = sqlite
    .prepare(
      `SELECT min_hr AS minHr, p5_hr AS p5Hr, avg_hr AS avgHr, max_hr AS maxHr, sample_count AS sampleCount
       FROM nightly_hr_stats WHERE night_date = ?`,
    )
    .get(date) as any;

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

  const adjacent = sqlite
    .prepare(
      `SELECT
         (SELECT night_date FROM sleep_sessions WHERE night_date < ? ORDER BY night_date DESC LIMIT 1) AS prev,
         (SELECT night_date FROM sleep_sessions WHERE night_date > ? ORDER BY night_date ASC LIMIT 1)  AS next`,
    )
    .get(date, date) as { prev: string | null; next: string | null };

  return (
    <main className="min-h-screen bg-ink-950 text-ink-100">
      <header className="hairline-b">
        <div className="px-8 py-6 flex items-baseline justify-between">
          <Link
            href="/"
            className="label-eyebrow hover:text-pulse transition"
          >
            ← Quantself
          </Link>
          <div className="flex items-center gap-6 label-eyebrow">
            {adjacent.prev && (
              <Link href={`/nights/${adjacent.prev}`} className="hover:text-pulse">
                ← {adjacent.prev.slice(5)}
              </Link>
            )}
            {adjacent.next && (
              <Link href={`/nights/${adjacent.next}`} className="hover:text-pulse">
                {adjacent.next.slice(5)} →
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="px-8 py-10 hairline-b">
        <div className="label-eyebrow mb-3">Night of {date}</div>
        <div className="flex items-baseline gap-8 flex-wrap">
          <div>
            <div className="font-display tnum text-pulse text-[8rem] leading-none font-light">
              {stats?.minHr != null ? Math.round(stats.minHr) : "—"}
            </div>
            <div className="font-mono text-xs tracking-widest text-ink-400 mt-2">
              SLEEPING LOW · BPM
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 ml-auto tnum">
            <Stat label="Mean" value={stats?.avgHr?.toFixed(1) ?? "—"} />
            <Stat label="Max" value={stats?.maxHr ? Math.round(stats.maxHr) : "—"} />
            <Stat label="P5" value={stats?.p5Hr?.toFixed(0) ?? "—"} />
            <Stat label="Samples" value={(stats?.sampleCount ?? 0).toLocaleString()} />
            <Stat
              label="Bedtime"
              value={`${fmtTime(session.sleepStart)} → ${fmtTime(session.sleepEnd)}`}
            />
            <Stat label="Total" value={fmtDuration(session.totalMinutes)} />
          </div>
        </div>
      </section>

      <section className="px-8 py-10 hairline-b">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-2xl text-ink-100 font-light">
            Heart rate <span className="text-ink-400 italic">through the night</span>
          </h2>
          <div className="flex items-center gap-4 label-eyebrow">
            <Legend color="#ff3b3b" label="Min" />
            <Legend color="#8a8a98" label="Avg" />
            <Legend color="#3d3d48" label="Max" />
          </div>
        </div>
        <NightChart
          samples={samples}
          sleepStart={session.sleepStart}
          sleepEnd={session.sleepEnd}
          minHr={stats?.minHr ?? null}
        />
      </section>

      <section className="px-8 py-10">
        <div className="label-eyebrow mb-4">Stages</div>
        <div className="grid grid-cols-4 gap-px bg-ink-800">
          <Stage label="DEEP" min={session.deepMinutes} total={session.totalMinutes} accent />
          <Stage label="REM" min={session.remMinutes} total={session.totalMinutes} accent />
          <Stage label="CORE" min={session.coreMinutes} total={session.totalMinutes} />
          <Stage label="AWAKE" min={session.awakeMinutes} total={session.totalMinutes} />
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] tracking-widest text-ink-500 font-mono">
        {label}
      </div>
      <div className="font-mono text-xl text-ink-100 mt-1 tnum">{value}</div>
    </div>
  );
}

function Stage({
  label,
  min,
  total,
  accent,
}: {
  label: string;
  min: number;
  total: number;
  accent?: boolean;
}) {
  const pct = total > 0 ? (min / total) * 100 : 0;
  return (
    <div className="bg-ink-950 px-6 py-6">
      <div className="text-[10px] tracking-widest text-ink-400 font-mono mb-2">
        {label}
      </div>
      <div className="font-display tnum text-3xl font-light text-ink-100">
        {Math.floor(min / 60)}h {String(Math.round(min % 60)).padStart(2, "0")}m
      </div>
      <div className="font-mono text-xs text-ink-500 mt-1 tnum">
        {pct.toFixed(0)}%
      </div>
      <div className="h-px bg-ink-800 mt-4 relative">
        <div
          className={`absolute left-0 top-0 h-px ${accent ? "bg-pulse" : "bg-ink-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-px w-4" style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}
