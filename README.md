# quantself

Personal sleeping-heart-rate dashboard. Local-first. Reads JSON exports from the
[Health Auto Export](https://www.healthexportapp.com/) iOS app, stores them in
SQLite, and serves a Next.js dashboard on `localhost:3000`.

## Stack

- Next.js 15 (App Router)
- SQLite via `better-sqlite3`
- Drizzle ORM (schema + types only — runtime queries use `better-sqlite3` directly)
- Recharts for charts
- Tailwind CSS

## First run

```bash
# 1. Install deps (pnpm or npm both work)
pnpm install      # or: npm install

# 2. Drop your Auto Export JSON into the inbox folder
cp ~/Downloads/HealthAutoExport-*.json data/inbox/

# 3. Ingest
pnpm ingest

# 4. Start the dashboard
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Daily routine

```bash
# After your daily Auto Export tap on iPhone:
cp ~/path/to/iCloud/HealthAutoExport/*.json data/inbox/
pnpm ingest
# → ingested files move to data/archive/, dashboard updates on next refresh
```

## How it works

- `data/inbox/*.json` → `scripts/ingest.ts` → SQLite at `db/health.db`
- The ingestor writes two raw tables:
  - `hr_samples` — every Min/Avg/Max bucket from `heart_rate`
  - `sleep_sessions` — one per night, from Auto Export's pre-grouped `sleep_analysis`
- Then it computes a third table:
  - `nightly_hr_stats` — joins HR samples against sleep windows, stores min/p5/avg/max per night
- The dashboard reads the precomputed stats, so queries are instant regardless of how much data you accumulate.

## Project layout

```
data/
  inbox/         # drop new exports here
  archive/       # moved here after successful ingest
db/
  health.db      # created on first ingest
scripts/
  ingest.ts      # the only command you need to run
src/
  app/
    page.tsx          # dashboard home
    nights/[date]/    # per-night detail
    api/              # JSON endpoints
  components/
    Header, StatsPanel, TrendChart, NightChart
  db/
    schema.ts, client.ts
  lib/
    parser.ts         # Auto Export JSON → DB rows
    sleep-hr.ts       # joins HR with sleep windows
```

## Reset the database

```bash
pnpm db:reset
# delete the inbox archive too if you want to re-ingest old files
mv data/archive/*.json data/inbox/
pnpm ingest
```
