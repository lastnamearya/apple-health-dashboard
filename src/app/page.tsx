import { sqlite } from "@/db/client";
import { Header } from "@/components/Header";
import { StatsPanel } from "@/components/StatsPanel";
import { TrendChart } from "@/components/TrendChart";

export const dynamic = "force-dynamic";

async function getStats() {
  const latest = sqlite
    .prepare(
      `SELECT s.night_date, s.sleep_start, s.sleep_end, s.total_minutes, s.deep_minutes, s.rem_minutes, s.core_minutes, s.awake_minutes,
              h.min_hr, h.p5_hr, h.avg_hr, h.max_hr, h.sample_count
       FROM sleep_sessions s
       LEFT JOIN nightly_hr_stats h ON h.night_date = s.night_date
       ORDER BY s.night_date DESC
       LIMIT 1`,
    )
    .get();

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
    .get();

  const totalNights =
    (sqlite.prepare(`SELECT COUNT(*) AS c FROM sleep_sessions`).get() as any)
      ?.c ?? 0;
  const totalSamples =
    (sqlite.prepare(`SELECT COUNT(*) AS c FROM hr_samples`).get() as any)?.c ??
    0;

  return { latest, baselines, totals: { nights: totalNights, hrSamples: totalSamples } };
}

async function getTrend() {
  const rows = sqlite
    .prepare(
      `SELECT s.night_date AS nightDate,
              s.total_minutes AS totalMinutes,
              h.min_hr AS minHr,
              h.p5_hr AS p5Hr,
              h.avg_hr AS avgHr,
              h.max_hr AS maxHr,
              h.sample_count AS sampleCount
       FROM sleep_sessions s
       LEFT JOIN nightly_hr_stats h ON h.night_date = s.night_date
       ORDER BY s.night_date ASC`,
    )
    .all() as any[];

  const withRolling = rows.map((r, i, arr) => {
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

  return withRolling;
}

export default async function HomePage() {
  const stats = await getStats();
  const rows = await getTrend();
  const hasData = stats.totals.nights > 0;
  const hasHrInSleep = rows.some((r: any) => r.minHr != null);

  return (
    <main className="min-h-screen bg-ink-950 text-ink-100">
      <Header
        totalNights={stats.totals.nights}
        totalSamples={stats.totals.hrSamples}
      />

      {!hasData ? (
        <EmptyState />
      ) : !hasHrInSleep ? (
        <SummaryOnlyState />
      ) : (
        <>
          <StatsPanel data={stats} />
          <TrendChart rows={rows} />
        </>
      )}

      <footer className="px-8 py-6 text-[10px] tracking-widest text-ink-500 font-mono">
        DROP NEW EXPORTS IN <span className="text-ink-300">data/inbox</span> · RUN <span className="text-ink-300">pnpm ingest</span>
      </footer>
    </main>
  );
}

function SummaryOnlyState() {
  return (
    <div className="px-8 py-24">
      <div className="max-w-xl">
        <div className="label-eyebrow mb-4">Summary-only data detected</div>
        <h1 className="font-display text-5xl text-ink-100 font-light leading-tight mb-6">
          Need <span className="text-pulse italic">per-sample</span> heart rate.
        </h1>
        <p className="text-ink-300 font-sans text-sm mb-6 leading-relaxed">
          Your sleep sessions imported correctly, but heart rate came in as
          daily aggregates only — no individual samples fell inside any sleep
          window.
        </p>
        <ol className="space-y-3 text-ink-300 font-mono text-sm">
          <li>
            <span className="text-ink-500 mr-3">01</span>
            In the Auto Export app, turn{" "}
            <span className="text-ink-100">Summarize Data</span> OFF
          </li>
          <li>
            <span className="text-ink-500 mr-3">02</span>
            Re-export the same date range
          </li>
          <li>
            <span className="text-ink-500 mr-3">03</span>
            Drop the new (much larger) JSON in{" "}
            <span className="text-ink-100">data/inbox/</span> and run{" "}
            <span className="text-pulse">pnpm ingest</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-8 py-24">
      <div className="max-w-xl">
        <div className="label-eyebrow mb-4">No data yet</div>
        <h1 className="font-display text-5xl text-ink-100 font-light leading-tight mb-6">
          Drop your <span className="text-pulse italic">first export</span><br />
          to begin.
        </h1>
        <ol className="space-y-3 text-ink-300 font-mono text-sm">
          <li>
            <span className="text-ink-500 mr-3">01</span>
            Place your Auto Export <span className="text-ink-100">.json</span> in{" "}
            <span className="text-ink-100">data/inbox/</span>
          </li>
          <li>
            <span className="text-ink-500 mr-3">02</span>
            Run <span className="text-pulse">pnpm ingest</span>
          </li>
          <li>
            <span className="text-ink-500 mr-3">03</span>
            Reload this page
          </li>
        </ol>
      </div>
    </div>
  );
}
