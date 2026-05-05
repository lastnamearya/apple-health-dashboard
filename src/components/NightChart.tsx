"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type Sample = { ts: number; value: number; kind: string };

export function NightChart({
  samples,
  sleepStart,
  sleepEnd,
  minHr,
}: {
  samples: Sample[];
  sleepStart: number;
  sleepEnd: number;
  minHr: number | null;
}) {
  // Group samples by timestamp into {ts, min, avg, max}
  const byTs = new Map<number, { ts: number; min?: number; avg?: number; max?: number }>();
  for (const s of samples) {
    const cur = byTs.get(s.ts) ?? { ts: s.ts };
    if (s.kind === "min") cur.min = s.value;
    else if (s.kind === "max") cur.max = s.value;
    else cur.avg = s.value;
    byTs.set(s.ts, cur);
  }
  const data = [...byTs.values()].sort((a, b) => a.ts - b.ts);

  const yVals = samples.map((s) => s.value);
  const yMin = Math.floor(Math.min(...yVals) - 3);
  const yMax = Math.ceil(Math.max(...yVals) + 3);

  return (
    <div className="h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
        >
          <CartesianGrid stroke="#16161a" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            domain={[sleepStart, sleepEnd]}
            scale="time"
            stroke="#5a5a68"
            tick={{ fill: "#8a8a98", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickFormatter={(t: number) => {
              const d = new Date(t);
              return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
            }}
          />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#5a5a68"
            tick={{ fill: "#8a8a98", fontSize: 10, fontFamily: "JetBrains Mono" }}
            width={40}
          />
          {minHr != null && (
            <ReferenceLine
              y={minHr}
              stroke="#ff3b3b"
              strokeDasharray="2 4"
              label={{
                value: `low ${Math.round(minHr)}`,
                position: "right",
                fill: "#ff3b3b",
                fontSize: 10,
                fontFamily: "JetBrains Mono",
              }}
            />
          )}
          <Tooltip
            cursor={{ stroke: "#3d3d48", strokeWidth: 1 }}
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null;
              const d = new Date(label);
              return (
                <div className="bg-ink-900 border border-ink-700 px-4 py-3 font-mono text-xs tnum">
                  <div className="text-ink-100 mb-1.5">
                    {String(d.getHours()).padStart(2, "0")}:
                    {String(d.getMinutes()).padStart(2, "0")}
                  </div>
                  {payload.map((p: any) => (
                    <div key={p.dataKey} className="flex items-center gap-3">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: p.stroke }}
                      />
                      <span className="text-ink-300 w-10">{p.dataKey}</span>
                      <span className="text-ink-100">{Math.round(p.value)}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="max"
            stroke="#3d3d48"
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#8a8a98"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="min"
            stroke="#ff3b3b"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
