function fmtNumber(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function fmtTime(ms: number | null | undefined) {
  if (ms == null) return "—";
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDuration(min: number | null | undefined) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function StatsPanel({ data }: { data: any }) {
  const latest = data?.latest;
  const b = data?.baselines ?? {};
  const minDelta =
    latest?.min_hr != null && b.min7 != null
      ? latest.min_hr - b.min7
      : null;

  return (
    <section className="hairline-b">
      <div className="grid grid-cols-12 gap-px bg-ink-700">
        {/* HEADLINE: latest sleeping low */}
        <div className="col-span-12 lg:col-span-5 bg-ink-950 px-8 py-10">
          <div className="label-eyebrow mb-3">Last Night · Sleeping Low</div>
          <div className="flex items-baseline gap-3">
            <span className="font-display tnum text-pulse text-[7rem] leading-none font-light">
              {fmtNumber(latest?.min_hr, 0)}
            </span>
            <span className="font-mono text-sm text-ink-400">bpm</span>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-ink-300 tnum">
            <span>{latest?.night_date ?? "—"}</span>
            <span className="text-ink-500">·</span>
            <span>
              {fmtTime(latest?.sleep_start)} → {fmtTime(latest?.sleep_end)}
            </span>
            <span className="text-ink-500">·</span>
            <span>{fmtDuration(latest?.total_minutes)}</span>
          </div>
          {minDelta != null && (
            <div className="mt-6 flex items-baseline gap-2">
              <span className="label-eyebrow">vs. 7-day baseline</span>
              <span
                className={`font-mono text-sm tnum ${
                  minDelta < -0.5
                    ? "text-signal-green"
                    : minDelta > 0.5
                      ? "text-signal-amber"
                      : "text-ink-200"
                }`}
              >
                {minDelta > 0 ? "+" : ""}
                {minDelta.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* SLEEP STAGES */}
        <div className="col-span-6 lg:col-span-3 bg-ink-950 px-8 py-10">
          <div className="label-eyebrow mb-4">Stages</div>
          <StageBar
            label="DEEP"
            min={latest?.deep_minutes}
            total={latest?.total_minutes}
          />
          <StageBar
            label="REM"
            min={latest?.rem_minutes}
            total={latest?.total_minutes}
          />
          <StageBar
            label="CORE"
            min={latest?.core_minutes}
            total={latest?.total_minutes}
          />
          <StageBar
            label="AWAKE"
            min={latest?.awake_minutes}
            total={latest?.total_minutes}
            muted
          />
        </div>

        {/* BASELINES */}
        <div className="col-span-6 lg:col-span-2 bg-ink-950 px-8 py-10">
          <div className="label-eyebrow mb-4">Baselines</div>
          <Baseline label="Low · 7d" value={fmtNumber(b.min7, 1)} />
          <Baseline label="Low · 30d" value={fmtNumber(b.min30, 1)} />
          <Baseline label="Avg · 7d" value={fmtNumber(b.avg7, 1)} />
          <Baseline label="Avg · 30d" value={fmtNumber(b.avg30, 1)} />
        </div>

        {/* AVG / MAX / SAMPLES */}
        <div className="col-span-12 lg:col-span-2 bg-ink-950 px-8 py-10">
          <div className="label-eyebrow mb-4">Last Night</div>
          <Baseline label="Mean" value={fmtNumber(latest?.avg_hr, 1)} />
          <Baseline label="Max" value={fmtNumber(latest?.max_hr, 0)} />
          <Baseline
            label="Samples"
            value={(latest?.sample_count ?? 0).toLocaleString()}
          />
        </div>
      </div>
    </section>
  );
}

function StageBar({
  label,
  min,
  total,
  muted,
}: {
  label: string;
  min: number | null | undefined;
  total: number | null | undefined;
  muted?: boolean;
}) {
  const pct = total && min ? (min / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] tracking-widest text-ink-300 font-mono">
          {label}
        </span>
        <span className="font-mono text-xs tnum text-ink-200">
          {fmtDuration(min)}
        </span>
      </div>
      <div className="h-px bg-ink-800 relative">
        <div
          className={`absolute left-0 top-0 h-px ${muted ? "bg-ink-400" : "bg-pulse"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Baseline({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <span className="text-[10px] tracking-widest text-ink-400 font-mono">
        {label}
      </span>
      <span className="font-mono text-sm tnum text-ink-100">{value}</span>
    </div>
  );
}
