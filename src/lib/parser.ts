import { createHash } from "node:crypto";

/** Auto Export emits dates like "2026-04-28 00:00:00 +0530" */
export function parseAutoExportDate(s: string): number {
  if (!s || typeof s !== "string") {
    throw new Error(`parseAutoExportDate: invalid input ${JSON.stringify(s)}`);
  }
  const fixed = s.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/,
    "$1T$2$3$4:$5"
  );
  const t = Date.parse(fixed);
  if (Number.isNaN(t)) {
    throw new Error(`Cannot parse Auto Export date: ${s}`);
  }
  return t;
}

export function hrId(ts: number, value: number, source: string | undefined) {
  return createHash("sha1")
    .update(`${ts}|${value.toFixed(2)}|${source ?? ""}`)
    .digest("hex")
    .slice(0, 16);
}

export type HrSampleRow = {
  id: string;
  ts: number;
  value: number;
  kind: "min" | "avg" | "max";
  source: string | null;
  ingestedAt: number;
};

export type SleepRow = {
  nightDate: string;
  sleepStart: number;
  sleepEnd: number;
  inBedStart: number | null;
  inBedEnd: number | null;
  totalMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  coreMinutes: number;
  awakeMinutes: number;
  source: string | null;
  ingestedAt: number;
};

type AutoExportFile = {
  data: {
    metrics: Array<{
      name: string;
      units: string;
      data: Array<Record<string, any>>;
    }>;
    workouts?: any[];
  };
};

const HOURS_TO_MIN = 60;
const MS_TO_MIN = 1 / 60000;

// =============================================================================
// HEART RATE
// =============================================================================

export function parseHrSamples(
  file: AutoExportFile,
  now = Date.now()
): HrSampleRow[] {
  const m = file.data.metrics.find((m) => m.name === "heart_rate");
  if (!m) return [];

  const out: HrSampleRow[] = [];
  for (const s of m.data) {
    // Detailed exports use `date` for the timestamp; fall back to `start` if absent
    const dateStr = s.date ?? s.start;
    if (!dateStr) continue;

    let ts: number;
    try {
      ts = parseAutoExportDate(dateStr);
    } catch {
      continue;
    }
    const source = s.source ?? null;

    // Min/Avg/Max bucket form
    if (s.Min != null || s.Avg != null || s.Max != null) {
      if (s.Min != null) {
        const v = Number(s.Min);
        out.push({
          id: hrId(ts, v, source ?? undefined) + "_min",
          ts,
          value: v,
          kind: "min",
          source,
          ingestedAt: now,
        });
      }
      if (s.Avg != null) {
        const v = Number(s.Avg);
        out.push({
          id: hrId(ts, v, source ?? undefined) + "_avg",
          ts,
          value: v,
          kind: "avg",
          source,
          ingestedAt: now,
        });
      }
      if (s.Max != null) {
        const v = Number(s.Max);
        out.push({
          id: hrId(ts, v, source ?? undefined) + "_max",
          ts,
          value: v,
          kind: "max",
          source,
          ingestedAt: now,
        });
      }
    } else if (s.qty != null) {
      // Single-value form
      const v = Number(s.qty);
      out.push({
        id: hrId(ts, v, source ?? undefined) + "_qty",
        ts,
        value: v,
        kind: "avg",
        source,
        ingestedAt: now,
      });
    }
  }
  return out;
}

// =============================================================================
// SLEEP — supports both pre-aggregated session format AND per-segment format
// =============================================================================

type SleepSegment = {
  start: number;
  end: number;
  stage: string; // "Core" | "Deep" | "REM" | "Awake" | "InBed" | "Asleep"
  source: string | null;
};

function isSegmentShape(entry: Record<string, any>): boolean {
  // Per-segment entries have `value` (stage label) and `start`/`end`,
  // and lack the rolled-up totals like `totalSleep` / `sleepStart`.
  return (
    typeof entry.value === "string" &&
    entry.start != null &&
    entry.end != null &&
    entry.totalSleep == null &&
    entry.sleepStart == null
  );
}

function isSessionShape(entry: Record<string, any>): boolean {
  // Pre-aggregated: has totalSleep + sleepStart/sleepEnd.
  return (
    entry.sleepStart != null &&
    entry.sleepEnd != null &&
    entry.totalSleep != null
  );
}

/** Group segments into sessions whenever the gap between them exceeds GAP_MIN. */
const SESSION_GAP_MIN = 90; // 90 min between segments = treat as a new session

function reconstructSessions(segments: SleepSegment[]): SleepRow[] {
  if (segments.length === 0) return [];
  // Sort by start
  segments.sort((a, b) => a.start - b.start);

  type Session = {
    start: number;
    end: number;
    source: string | null;
    stages: Record<string, number>; // minutes by stage
  };

  const sessions: Session[] = [];
  let cur: Session | null = null;

  for (const seg of segments) {
    const segMin = (seg.end - seg.start) * MS_TO_MIN;
    if (segMin <= 0) continue;

    if (!cur || seg.start - cur.end > SESSION_GAP_MIN * 60_000) {
      cur = { start: seg.start, end: seg.end, source: seg.source, stages: {} };
      sessions.push(cur);
    } else {
      cur.end = Math.max(cur.end, seg.end);
    }
    cur.stages[seg.stage] = (cur.stages[seg.stage] ?? 0) + segMin;
  }

  const now = Date.now();
  return sessions.map((s) => {
    const deep = s.stages["Deep"] ?? s.stages["AsleepDeep"] ?? 0;
    const rem = s.stages["REM"] ?? s.stages["AsleepREM"] ?? 0;
    const core = s.stages["Core"] ?? s.stages["AsleepCore"] ?? 0;
    const awake = s.stages["Awake"] ?? 0;
    const inBed = s.stages["InBed"] ?? 0;
    // "Asleep" (without specifying stage) — older HealthKit segments. Treat as Core.
    const undifferentiatedAsleep = s.stages["Asleep"] ?? 0;

    const totalAsleep = deep + rem + core + undifferentiatedAsleep;
    const wake = new Date(s.end);
    const nightDate = `${wake.getFullYear()}-${String(wake.getMonth() + 1).padStart(2, "0")}-${String(wake.getDate()).padStart(2, "0")}`;

    return {
      nightDate,
      sleepStart: s.start,
      sleepEnd: s.end,
      inBedStart: inBed > 0 ? s.start : null,
      inBedEnd: inBed > 0 ? s.end : null,
      totalMinutes: totalAsleep,
      deepMinutes: deep,
      remMinutes: rem,
      coreMinutes: core + undifferentiatedAsleep,
      awakeMinutes: awake,
      source: s.source,
      ingestedAt: now,
    };
  });
}

export function parseSleepSessions(
  file: AutoExportFile,
  now = Date.now()
): SleepRow[] {
  const m = file.data.metrics.find((m) => m.name === "sleep_analysis");
  if (!m || !m.data || m.data.length === 0) return [];

  // Branch: are these pre-aggregated sessions or raw segments?
  const sample = m.data[0];

  if (isSessionShape(sample)) {
    // Original code path — already-grouped session entries
    const out: SleepRow[] = [];
    for (const s of m.data) {
      if (!isSessionShape(s)) continue;
      const sleepStart = parseAutoExportDate(s.sleepStart);
      const sleepEnd = parseAutoExportDate(s.sleepEnd);
      const inBedStart = s.inBedStart
        ? parseAutoExportDate(s.inBedStart)
        : null;
      const inBedEnd = s.inBedEnd ? parseAutoExportDate(s.inBedEnd) : null;
      const wake = new Date(sleepEnd);
      const nightDate = `${wake.getFullYear()}-${String(wake.getMonth() + 1).padStart(2, "0")}-${String(wake.getDate()).padStart(2, "0")}`;
      out.push({
        nightDate,
        sleepStart,
        sleepEnd,
        inBedStart,
        inBedEnd,
        totalMinutes: (s.totalSleep ?? 0) * HOURS_TO_MIN,
        deepMinutes: (s.deep ?? 0) * HOURS_TO_MIN,
        remMinutes: (s.rem ?? 0) * HOURS_TO_MIN,
        coreMinutes: (s.core ?? 0) * HOURS_TO_MIN,
        awakeMinutes: (s.awake ?? 0) * HOURS_TO_MIN,
        source: s.source ?? null,
        ingestedAt: now,
      });
    }
    return out;
  }

  if (isSegmentShape(sample)) {
    const segments: SleepSegment[] = [];
    for (const e of m.data) {
      if (!isSegmentShape(e)) continue;
      try {
        segments.push({
          start: parseAutoExportDate(e.start),
          end: parseAutoExportDate(e.end),
          stage: String(e.value),
          source: e.source ?? null,
        });
      } catch {
        // skip bad entries
      }
    }
    return reconstructSessions(segments);
  }

  // Unknown shape — log a warning so the user knows we skipped sleep
  console.warn(
    `parser: sleep_analysis has unknown shape (sample keys: ${Object.keys(
      sample
    ).join(", ")}). Skipping sleep ingestion.`
  );
  return [];
}
