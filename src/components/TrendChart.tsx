"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import Link from "next/link";

type Row = {
  nightDate: string;
  minHr: number | null;
  avgHr: number | null;
  maxHr: number | null;
  minRoll: number | null;
  avgRoll: number | null;
  totalMinutes: number;
  sampleCount: number;
};

export function TrendChart({ rows }: { rows: Row[] }) {
  const data = rows.filter((r) => r.minHr != null);
  if (data.length === 0) {
    return (
      <div className="px-8 py-16 text-center text-ink-400">
        No HR data inside any sleep window yet. Try ingesting an export with
        per-sample HR (Summarize Data: OFF).
      </div>
    );
  }

  // Compute Y-axis bounds with a bit of padding
  const lows = data.map((r) => r.minHr!).filter(Boolean);
  const highs = data
    .map((r) => r.maxHr ?? r.avgHr ?? r.minHr!)
    .filter(Boolean) as number[];
  const yMin = Math.floor(Math.min(...lows) - 4);
  const yMax = Math.ceil(Math.max(...highs) + 4);

  const median = [...lows].sort((a, b) => a - b)[Math.floor(lows.length / 2)];

  return (
    <section className="px-8 py-10 hairline-b">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-3xl text-ink-100 font-light">
          Nightly heart rate <span className="text-ink-400 italic">trend</span>
        </h2>
        <div className="flex items-center gap-6 label-eyebrow">
          <LegendDot color="#ff3b3b" label="Min" />
          <LegendDot color="#5a5a68" label="Avg" />
          <LegendDot color="#c92a2a" label="Min · 7d roll" dashed />
        </div>
      </div>

      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
          >
            <CartesianGrid stroke="#16161a" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="nightDate"
              stroke="#5a5a68"
              tick={{ fill: "#8a8a98", fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickFormatter={(d: string) => d.slice(5)}
              minTickGap={32}
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke="#5a5a68"
              tick={{ fill: "#8a8a98", fontSize: 10, fontFamily: "JetBrains Mono" }}
              width={40}
            />
            <ReferenceLine
              y={median}
              stroke="#3d3d48"
              strokeDasharray="2 4"
              label={{
                value: `med ${Math.round(median)}`,
                position: "right",
                fill: "#5a5a68",
                fontSize: 10,
                fontFamily: "JetBrains Mono",
              }}
            />
            <Tooltip
              cursor={{ stroke: "#3d3d48", strokeWidth: 1 }}
              content={<CustomTooltip />}
            />
            {/* Min/Max range as filled area */}
            <Area
              type="monotone"
              dataKey="maxHr"
              stroke="none"
              fill="#1d1d22"
              fillOpacity={0.6}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="minHr"
              stroke="none"
              fill="#0a0a0b"
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="avgHr"
              stroke="#5a5a68"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="minHr"
              stroke="#ff3b3b"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#ff3b3b", strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="minRoll"
              stroke="#c92a2a"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Night-by-night strip — clickable */}
      <div className="mt-10">
        <div className="label-eyebrow mb-3">Nights · click to inspect</div>
        <div className="grid grid-cols-7 lg:grid-cols-14 gap-px bg-ink-800">
          {data.slice(-28).map((r) => (
            <Link
              key={r.nightDate}
              href={`/nights/${r.nightDate}`}
              className="bg-ink-950 hover:bg-ink-900 transition px-3 py-3 group"
            >
              <div className="font-mono text-[10px] text-ink-400 mb-1 tnum">
                {r.nightDate.slice(5)}
              </div>
              <div className="font-display tnum text-2xl text-pulse font-light leading-none">
                {Math.round(r.minHr!)}
              </div>
              <div className="font-mono text-[10px] text-ink-500 mt-1 tnum">
                {Math.round(r.avgHr ?? 0)} avg
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block h-px w-4"
        style={{
          background: color,
          borderTop: dashed ? `1px dashed ${color}` : "none",
          height: dashed ? 0 : 1,
        }}
      />
      <span>{label}</span>
    </span>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Row;
  return (
    <div className="bg-ink-900 border border-ink-700 px-4 py-3 font-mono text-xs tnum">
      <div className="text-ink-100 mb-2">{label}</div>
      <Row label="Min" value={d.minHr} color="#ff3b3b" />
      <Row label="Avg" value={d.avgHr} color="#8a8a98" />
      <Row label="Max" value={d.maxHr} color="#5a5a68" />
      <Row label="Min · 7d" value={d.minRoll} color="#c92a2a" />
      <div className="mt-2 pt-2 border-t border-ink-700 text-ink-400 text-[10px]">
        {Math.round(d.totalMinutes / 60)}h sleep · {d.sampleCount} samples
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 my-0.5">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-ink-300 w-14">{label}</span>
      <span className="text-ink-100">
        {value != null ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}
