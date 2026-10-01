# Presenza: Progress

Resume here in a new session. Read `PRESENZA_SPEC.md`, then `docs/PLAN.md`, `docs/DECISIONS.md`.

Current stage: **Step 3B built and tested in memory. Waiting for the user to run `npm run db:push` and try the Import page. Step 4 (seed) is on hold by the user.**

## Database changes (already applied; kept for reference)

The database already exists, so the new column needs a backfill first. Run this SQL once (psql / Drizzle Studio):

```sql
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS day_of_week smallint;
UPDATE class_sessions SET day_of_week = EXTRACT(ISODOW FROM session_date)::smallint WHERE day_of_week IS NULL;
ALTER TABLE class_sessions ALTER COLUMN day_of_week SET NOT NULL;
```

Then apply the rest (the `deleted` column on all 19 tables, default false, plus 6 new indexes). If you have been using push:

```
npm run db:push
```

If you use migration files, run `npm run db:generate` then `npm run db:migrate` instead and check the SQL first; there is no `db/migrations/` folder in git, so generate would try to create every table. `db:push` is the safer choice against an existing database.

Do not run `npm run db:seed` (placeholder seed writes straight to tables; replaced in Step 4).

## Step 1: Plan
- [x] All five docs written
- [x] Approval ("continue")

## Step 2: Schema and analytics
- [x] npm install, read Next.js docs (route handlers)
- [x] `deleted` on all 19 tables (shared helper `db/schema/columns.ts`)
- [x] `class_sessions.day_of_week` + filter indexes in schema files
- [x] USER: applied database changes (verified read-only: 19 `deleted` columns, `day_of_week` NOT NULL, 6 indexes)
- [x] formulas.ts + tests (`server/services/analytics/formulas.ts`)
- [x] filters.ts (six filters + date range + soft-delete + cancelled sessions)
- [x] summary, statusBreakdown
- [x] trend (day/week/month)
- [x] absencesByDayOfWeek, lateByHour
- [x] bySubject, bySection
- [x] studentReport, lowAttendance, filterOptions
- [x] tRPC init, routers, route handler (`/api/trpc`)
- [x] Test fixture in `tests/analytics/fixture.ts` (in-memory PGlite only)
- [x] 42 tests passing (`npm test`)
- [x] Verified against the real database (read-only): summary, filter options, trend run on the 1 placeholder row

## Step 3: Frontend
- [x] Installed tRPC client, TanStack Query, Recharts
- [x] Package renamed to `presenza`, metadata title template, `app/theme.css`
- [x] NavBar, StatCard, ChartCard, FilterBar, DataTable (+ Pagination, StateView, charts)
- [x] Dashboard, Trends, Comparisons, Reports pages
- [x] `next build` passes; pages and charts verified in headless Chrome against the real DB (1 placeholder row, so charts are nearly empty until data is imported)
- [ ] Not checked: pages with a large dataset (waits for Steps 3B/4)

## Step 3B: File import (CSV/XLSX, undo, clear all)
- [x] Plan written and approved: PLAN.md 8 to 16, API.md, DATA_MODEL.md section 7, DECISIONS D-18 to D-27
- [x] Schema: `import_batches` + `attendance_logs.import_batch_id` (db/schema/imports.ts)
- [ ] USER: run `npm run db:push` (additive, nullable, no backfill) and then try the Import page
- [x] papaparse, exceljs installed
- [x] dates, names, columns, row-schema (zod), validate, parse + tests
- [x] fixture files in tests/import/fixtures (csv, xlsx, invalid, no-times, missing-columns; make-xlsx.mts builds the xlsx)
- [x] importRows (create, re-upload, update, revive, minutesLate, schedule inference, terms never reject, cancelled sessions, preview rollback) + tests
- [x] undo + clear all + tRPC `import` router + tests
- [x] POST /api/import, GET /api/import/template
- [x] Import page, nav link, theme.css additions
- [x] 77 tests pass; tsc, eslint, next build clean; HTTP error paths checked with curl
- [ ] Not yet run against the real database (needs the db:push above). PGlite tests cover the same SQL.

## Step 4: Seed (ON HOLD by the user; only start when told, and ask to confirm first)
- [ ] Replace placeholder db/seed.ts with generator that calls the import service
- [ ] Print record counts
