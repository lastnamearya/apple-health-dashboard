// scripts/diagnose-hr.ts
import { readFileSync } from "node:fs";

const path =
  process.argv[2] ?? "data/inbox/HealthAutoExport-2026-04-28-2026-05-05.json";
const raw = JSON.parse(readFileSync(path, "utf8"));

const hr = raw.data.metrics.find((m: any) => m.name === "heart_rate");

if (!hr) {
  console.log("No heart_rate metric.");
  process.exit(0);
}

console.log(`heart_rate: ${hr.data.length} entries\n`);

console.log("=== FIRST 3 ENTRIES ===");
for (let i = 0; i < 3; i++) {
  console.log(`\n[${i}]`, JSON.stringify(hr.data[i], null, 2));
}

console.log("\n=== LAST 3 ENTRIES ===");
for (let i = hr.data.length - 3; i < hr.data.length; i++) {
  console.log(`\n[${i}]`, JSON.stringify(hr.data[i], null, 2));
}

console.log("\n=== UNIQUE KEY SETS ===");
const sets = new Map<string, number>();
for (const e of hr.data) {
  const k = Object.keys(e).sort().join(",");
  sets.set(k, (sets.get(k) ?? 0) + 1);
}
for (const [k, n] of sets) console.log(`  ${n}x: ${k}`);

// Samples per day
console.log("\n=== SAMPLES PER DAY ===");
const byDay = new Map<string, number>();
for (const e of hr.data) {
  const d = (e.date ?? e.start ?? "").slice(0, 10);
  byDay.set(d, (byDay.get(d) ?? 0) + 1);
}
for (const [d, n] of [...byDay.entries()].sort()) {
  console.log(`  ${d}: ${n.toLocaleString()}`);
}
