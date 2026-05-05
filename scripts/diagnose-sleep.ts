// scripts/diagnose-sleep.ts
// Run with: npx tsx scripts/diagnose-sleep.ts <path-to-json>
import { readFileSync } from "node:fs";

const path =
  process.argv[2] ?? "data/inbox/HealthAutoExport-2026-04-28-2026-05-05.json";
const raw = JSON.parse(readFileSync(path, "utf8"));

const sleep = raw.data.metrics.find((m: any) => m.name === "sleep_analysis");

if (!sleep) {
  console.log("No sleep_analysis metric found.");
  process.exit(0);
}

console.log(`sleep_analysis: ${sleep.data.length} entries\n`);

// Show first 3 entries in full
console.log("=== FIRST 3 ENTRIES (full shape) ===");
for (let i = 0; i < Math.min(3, sleep.data.length); i++) {
  console.log(`\n[${i}]`);
  console.log(JSON.stringify(sleep.data[i], null, 2));
}

// Find all unique key sets
console.log("\n=== UNIQUE KEY SETS ACROSS ALL ENTRIES ===");
const keySets = new Map<string, number>();
for (const entry of sleep.data) {
  const keys = Object.keys(entry).sort().join(",");
  keySets.set(keys, (keySets.get(keys) ?? 0) + 1);
}
for (const [keys, count] of keySets) {
  console.log(`\n  ${count}x: ${keys}`);
}

// Find any entries missing sleepStart (the cause of the crash)
const missingStart = sleep.data.filter((e: any) => !e.sleepStart);
console.log(`\n=== ENTRIES MISSING sleepStart: ${missingStart.length} ===`);
if (missingStart.length > 0) {
  console.log("First one:");
  console.log(JSON.stringify(missingStart[0], null, 2));
}
