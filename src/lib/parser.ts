import { createHash } from "node:crypto";

/** Auto Export emits dates like "2026-04-28 00:00:00 +0530" */
export function parseAutoExportDate(s: string): number {
  // Convert "2026-04-28 12:25:16 +0530" to ISO 8601 the JS Date can parse.
  // Replace the space between date and time with 'T', leave timezone alone.
  // The +HHMM offset is non-standard in JS Date — convert "+0530" → "+05:30".
  const fixed = s.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/,
    "$1T$2$3$4:$5",
  );
  const t = Date.parse(fixed);
  if (Number.isNaN(t)) {
    throw new Error(`Cannot parse Auto Export date: ${s}`);
  }
  return t;
}

/** Stable id from the natural fingerprint of the sample */
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
  nightDate: string; // YYYY-MM-DD of wake date
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

export function parseHrSamples(file: AutoExportFile, now = Date.now()): HrSampleRow[] {
  const m = file.data.metrics.find((m) => m.name === "heart_rate");
  if (!m) return [];

  const out: HrSampleRow[] = [];
  for (const s of m.data) {
    const ts = parseAutoExportDate(s.date);
    const source = s.source ?? null;
    // Auto Export with "Summarize Data: OFF" still produces small Min/Avg/Max buckets.
    // We keep all three as separate rows tagged with `kind` so downstream queries can
    // pick the right one (e.g. Min for sleeping low).
    if (s.Min != null) {
      const v = Number(s.Min);
      out.push({ id: hrId(ts, v, source ?? undefined) + "_min", ts, value: v, kind: "min", source, ingestedAt: now });
    }
    if (s.Avg != null) {
      const v = Number(s.Avg);
      out.push({ id: hrId(ts, v, source ?? undefined) + "_avg", ts, value: v, kind: "avg", source, ingestedAt: now });
    }
    if (s.Max != null) {
      const v = Number(s.Max);
      out.push({ id: hrId(ts, v, source ?? undefined) + "_max", ts, value: v, kind: "max", source, ingestedAt: now });
    }
    // Some samples are single-value `qty` instead of Min/Avg/Max
    if (s.Min == null && s.Avg == null && s.Max == null && s.qty != null) {
      const v = Number(s.qty);
      out.push({ id: hrId(ts, v, source ?? undefined) + "_qty", ts, value: v, kind: "avg", source, ingestedAt: now });
    }
  }
  return out;
}

export function parseSleepSessions(file: AutoExportFile, now = Date.now()): SleepRow[] {
  const m = file.data.metrics.find((m) => m.name === "sleep_analysis");
  if (!m) return [];

  const out: SleepRow[] = [];
  for (const s of m.data) {
    const sleepStart = parseAutoExportDate(s.sleepStart);
    const sleepEnd = parseAutoExportDate(s.sleepEnd);
    const inBedStart = s.inBedStart ? parseAutoExportDate(s.inBedStart) : null;
    const inBedEnd = s.inBedEnd ? parseAutoExportDate(s.inBedEnd) : null;

    // Use the wake-up date in local time as the canonical "night key".
    // (Auto Export's `date` field is the night-of date; sleepEnd is the next morning.
    //  We prefer sleepEnd → that's the date the user thinks of as "this night's data".)
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
