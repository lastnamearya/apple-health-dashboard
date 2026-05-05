"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

export type MetricsData = {
  steps7d: Array<{ date: string; steps: number }>;
  rhr7d: Array<{ date: string; value: number }>;
  hrv7d: Array<{ date: string; value: number }>;
  vo2Latest: { date: string; value: number } | null;
  weight7d: Array<{ date: string; value: number }>;
  sleepScore: {
    score: number;
    duration: number;
    deep: number;
    rem: number;
    efficiency: number;
  } | null;
};

function fmtDate(d: string) {
  return d.slice(5); // MM-DD
}

function fmtNum(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function vo2Category(v: number): { label: string; color: string } {
  // Male reference ranges (approximate)
  if (v >= 55) return { label: "Superior", color: "#22c55e" };
  if (v >= 47) return { label: "Excellent", color: "#86efac" };
  if (v >= 42) return { label: "Good", color: "#a3e635" };
  if (v >= 37) return { label: "Fair", color: "#facc15" };
  return { label: "Poor", color: "#f87171" };
}

function CardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-950 px-6 py-8">
      <div className="label-eyebrow mb-5">{title}</div>
      {children}
    </div>
  );
}

function EmptyCard({ title }: { title: string }) {
  return (
    <CardShell title={title}>
      <div className="font-mono text-ink-500 text-sm">No data yet</div>
      <div className="font-mono text-ink-600 text-[10px] mt-2">
        Re-export & run pnpm ingest
      </div>
    </CardShell>
  );
}

// ─── Steps Card ──────────────────────────────────────────────────────────────

function StepsCard({ data }: { data: Array<{ date: string; steps: number }> }) {
  if (data.length === 0) return <EmptyCard title="DAILY STEPS" />;

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const avg = Math.round(sorted.reduce((s, r) => s + r.steps, 0) / sorted.length);

  return (
    <CardShell title="DAILY STEPS">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display tnum text-[3.5rem] leading-none font-light text-ink-100">
          {Math.round(latest.steps).toLocaleString()}
        </span>
      </div>
      <div className="font-mono text-[10px] text-ink-400 mb-5 tnum">
        {latest.date} · 7d avg {avg.toLocaleString()}
      </div>
      <div className="h-[80px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            barCategoryGap="20%"
          >
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fill: "#5a5a68", fontSize: 9, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              cursor={{ fill: "#1d1d22" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const r = payload[0].payload;
                return (
                  <div className="bg-ink-900 border border-ink-700 px-3 py-2 font-mono text-xs tnum">
                    <div className="text-ink-300">{r.date}</div>
                    <div className="text-ink-100">{Math.round(r.steps).toLocaleString()} steps</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="steps" fill="#ff3b3b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  );
}

// ─── RHR Card ────────────────────────────────────────────────────────────────

function RhrCard({ data }: { data: Array<{ date: string; value: number }> }) {
  if (data.length === 0) return <EmptyCard title="RESTING HR" />;

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const delta =
    sorted.length >= 2
      ? latest.value - sorted[sorted.length - 2].value
      : null;

  return (
    <CardShell title="RESTING HR">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display tnum text-[3.5rem] leading-none font-light text-pulse">
          {fmtNum(latest.value, 0)}
        </span>
        <span className="font-mono text-sm text-ink-400">bpm</span>
      </div>
      <div className="font-mono text-[10px] text-ink-400 mb-5 tnum flex items-center gap-2">
        <span>{latest.date}</span>
        {delta != null && (
          <>
            <span className="text-ink-600">·</span>
            <span
              className={
                delta < -0.5
                  ? "text-signal-green"
                  : delta > 0.5
                    ? "text-signal-amber"
                    : "text-ink-400"
              }
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} vs prev
            </span>
          </>
        )}
      </div>
      {sorted.length > 1 && (
        <div className="h-[60px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sorted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <YAxis hide domain={["auto", "auto"]} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#ff3b3b"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

// ─── HRV Card ────────────────────────────────────────────────────────────────

function HrvCard({ data }: { data: Array<{ date: string; value: number }> }) {
  if (data.length === 0) return <EmptyCard title="HRV" />;

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const delta =
    sorted.length >= 2
      ? latest.value - sorted[sorted.length - 2].value
      : null;

  return (
    <CardShell title="HRV">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display tnum text-[3.5rem] leading-none font-light text-ink-100">
          {fmtNum(latest.value, 0)}
        </span>
        <span className="font-mono text-sm text-ink-400">ms</span>
      </div>
      <div className="font-mono text-[10px] text-ink-400 mb-5 tnum flex items-center gap-2">
        <span>{latest.date}</span>
        {delta != null && (
          <>
            <span className="text-ink-600">·</span>
            <span
              className={
                delta > 0.5
                  ? "text-signal-green"
                  : delta < -0.5
                    ? "text-signal-amber"
                    : "text-ink-400"
              }
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} vs prev
            </span>
          </>
        )}
      </div>
      {sorted.length > 1 && (
        <div className="h-[60px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sorted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <YAxis hide domain={["auto", "auto"]} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8a8a98"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

// ─── VO₂ Max Card ────────────────────────────────────────────────────────────

function Vo2Card({
  latest,
}: {
  latest: { date: string; value: number } | null;
}) {
  if (!latest) return <EmptyCard title="VO₂ MAX" />;

  const cat = vo2Category(latest.value);
  return (
    <CardShell title="VO₂ MAX">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display tnum text-[3.5rem] leading-none font-light text-ink-100">
          {fmtNum(latest.value, 1)}
        </span>
        <span className="font-mono text-[10px] text-ink-400 leading-none">
          mL/kg/min
        </span>
      </div>
      <div className="font-mono text-[10px] text-ink-400 mb-4 tnum">
        {latest.date}
      </div>
      <div
        className="inline-block font-mono text-[10px] tracking-widest px-2 py-1"
        style={{ color: cat.color, border: `1px solid ${cat.color}33` }}
      >
        {cat.label.toUpperCase()}
      </div>
    </CardShell>
  );
}

// ─── Weight Card ─────────────────────────────────────────────────────────────

function WeightCard({
  data,
}: {
  data: Array<{ date: string; value: number }>;
}) {
  if (data.length === 0) return <EmptyCard title="WEIGHT" />;

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const delta =
    sorted.length >= 2
      ? latest.value - sorted[sorted.length - 2].value
      : null;

  return (
    <CardShell title="WEIGHT">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display tnum text-[3.5rem] leading-none font-light text-ink-100">
          {fmtNum(latest.value, 1)}
        </span>
        <span className="font-mono text-sm text-ink-400">kg</span>
      </div>
      <div className="font-mono text-[10px] text-ink-400 mb-5 tnum flex items-center gap-2">
        <span>{latest.date}</span>
        {delta != null && (
          <>
            <span className="text-ink-600">·</span>
            <span
              className={
                delta < -0.1
                  ? "text-signal-green"
                  : delta > 0.1
                    ? "text-signal-amber"
                    : "text-ink-400"
              }
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} kg
            </span>
          </>
        )}
      </div>
      {sorted.length > 1 && (
        <div className="h-[60px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sorted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <YAxis hide domain={["auto", "auto"]} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8a8a98"
                strokeWidth={1.5}
                dot={{ r: 2, fill: "#8a8a98", strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

// ─── Sleep Score Card ─────────────────────────────────────────────────────────

function SleepScoreCard({
  score,
}: {
  score: MetricsData["sleepScore"];
}) {
  if (!score) return <EmptyCard title="SLEEP SCORE" />;

  const color =
    score.score >= 80
      ? "#22c55e"
      : score.score >= 60
        ? "#facc15"
        : "#f87171";

  return (
    <CardShell title="SLEEP SCORE">
      <div className="flex items-baseline gap-2 mb-4">
        <span
          className="font-display tnum text-[3.5rem] leading-none font-light"
          style={{ color }}
        >
          {score.score}
        </span>
        <span className="font-mono text-sm text-ink-400">/ 100</span>
      </div>
      <div className="space-y-2">
        <ScoreRow label="Duration" value={score.duration} max={40} />
        <ScoreRow label="Deep" value={score.deep} max={25} />
        <ScoreRow label="REM" value={score.rem} max={25} />
        <ScoreRow label="Efficiency" value={score.efficiency} max={10} />
      </div>
    </CardShell>
  );
}

function ScoreRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="font-mono text-[10px] text-ink-400 tracking-widest">
          {label.toUpperCase()}
        </span>
        <span className="font-mono text-[10px] text-ink-300 tnum">
          {value.toFixed(0)}/{max}
        </span>
      </div>
      <div className="h-px bg-ink-800 relative">
        <div
          className="absolute left-0 top-0 h-px bg-pulse"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function MetricsGrid({ metrics }: { metrics: MetricsData }) {
  const hasAnyData =
    metrics.steps7d.length > 0 ||
    metrics.rhr7d.length > 0 ||
    metrics.hrv7d.length > 0 ||
    metrics.vo2Latest != null ||
    metrics.weight7d.length > 0;

  return (
    <section className="hairline-b">
      <div className="px-8 pt-10 pb-4">
        <h2 className="font-display text-3xl text-ink-100 font-light">
          Health <span className="text-ink-400 italic">metrics</span>
        </h2>
        {!hasAnyData && (
          <p className="font-mono text-ink-500 text-xs mt-3">
            Re-export your Apple Health data and run{" "}
            <span className="text-ink-300">pnpm ingest</span> to populate these
            cards.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-ink-700">
        <StepsCard data={metrics.steps7d} />
        <RhrCard data={metrics.rhr7d} />
        <HrvCard data={metrics.hrv7d} />
        <Vo2Card latest={metrics.vo2Latest} />
        <WeightCard data={metrics.weight7d} />
        <SleepScoreCard score={metrics.sleepScore} />
      </div>
    </section>
  );
}
