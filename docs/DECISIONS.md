# Presenza: Decisions Log

Running log. Newest entries go at the bottom. Each entry: what, why, tradeoff.

## D-01: Keep Drizzle, not Prisma (2026-10-01)
Brief said Prisma; repo already has a 19-table Drizzle schema, relations, and drizzle-kit config. You chose to keep Drizzle. All 7 spec entities are covered by existing tables. The "stack" line changes, scope does not.

## D-02: Attendance formula (2026-10-01)
```
counted        = total records - excused
attendanceRate = (present + late) / counted
lateRate       = late / counted
absenceRate    = absent / counted
```
- Late counts as attending, so `attendanceRate + absenceRate = 1`.
- Excused records are removed from the denominator and from all three rates.
- If `counted = 0` the rate is `null` (not 0), so empty groups are not shown as "0% attendance".
- Low attendance: `attendanceRate < 0.80`, strictly. Exactly 80% is not low.
- One implementation: `rates()` in `server/services/analytics/formulas.ts`. SQL only counts by status.

## D-03: Counts in SQL, rates in TypeScript (2026-10-01)
SQL returns `COUNT(*) GROUP BY (dimension, status)`; TS assembles `Stats`. Reason: the formula exists once, and the data volume returned is small. Tradeoff: low-attendance filtering and student sorting by rate happen in TS after per-student grouping (a few thousand rows at most).

## D-04: Dates as strings, no superjson (2026-10-01)
API uses `YYYY-MM-DD` / `YYYY-MM`. Avoids timezone shifts and an extra dependency. Timestamps stored without time zone, as the existing schema does.

## D-05: Soft delete handling (2026-10-01)
`deleted` boolean on all tables. Analytics exclude a row if any joined table is deleted. Unique constraints stay as they are, so import revives a soft-deleted row instead of inserting a duplicate. Tradeoff: fewer schema edits vs. partial unique indexes; the revive logic is the cost and will be tested in 3B.

## D-06: Cancelled sessions never count (2026-10-01)
`session_status = 'cancelled'` is excluded from all numbers. `held` and `makeup` count. Reason: holidays and suspensions are not absences.

## D-07: Tests use PGlite in memory (2026-10-01)
Fixture is inserted into an in-memory Postgres (PGlite), so grouping and filter SQL is really exercised and the real database cannot be touched (no connection string exists in tests). The schema is created with `drizzle-kit/api-postgres` `pushSchema`, so tests always use the real schema files. Works with Drizzle 1.0 RC4; no fallback needed. Fixture and its hand-computed expectations: `tests/analytics/fixture.ts`.

## D-08: One `trend` procedure with granularity (2026-10-01)
The brief lists daily, weekly, monthly trends. They differ only by bucket, so one procedure with `granularity` avoids three copies of the same query.

## D-09: Day-of-week column on sessions (2026-10-01)
Add `class_sessions.day_of_week` like the other precomputed time-grain columns. Approved via your message that the schema may be modified. Writer (import service) fills it; migration backfills existing rows.

## D-10: Status breakdown uses shares of total (2026-10-01)
Shares of all four statuses sum to 1 over `total`, since the spec says "share of present, late, absent, and excused". This differs from the rates, which exclude excused. Documented so the two are not confused.

## D-11: Styling approach (2026-10-01)
All tokens (colors, spacing, type, chart palette, status colors) and every component class live in `app/theme.css`, with a dark variant under `prefers-color-scheme`. Components use semantic class names (`card`, `stat__value`, `table`…) and contain no colors. Tailwind stays installed only for its reset; no Tailwind utility classes are used, so a redesign means editing one file. Charts take colors from `lib/chart-theme.ts`, which only returns `var(--…)` strings.

## D-12: Dependencies added for Step 2 (2026-10-01)
`@trpc/server`, `zod` (runtime); `vitest`, `@electric-sql/pglite` (dev). `@types/node` bumped from ^20 to ^22 because Vitest 5 requires it (local Node is 22.15). Frontend packages (tRPC client, TanStack Query, Recharts) are deferred to Step 3.

## D-13: Plan questions answered by "continue" (2026-10-01)
You said "continue" after the plan, so I took the recommended answer for each open question in PLAN.md section 7: PGlite tests, Tailwind with semantic tokens, stacked-bar status breakdown, extra Dashboard figures plus synthetic-data footer, fixed 80% threshold. Say so if any should change. Question 1 (migration workflow) changed because the database already exists: see PROGRESS.md for the exact commands.

## D-14: Session day of week stored on class_sessions (2026-10-01)
Implemented as `class_sessions.day_of_week` (smallint, NOT NULL, indexed). The importer must fill it with ISO weekday (1 = Monday). The one-off SQL to add and backfill it on the existing database is in PROGRESS.md.

## D-15: Optional tRPC inputs (2026-10-01)
Every analytics procedure with a filter accepts no input at all; zod defaults fill in an empty filter. The filter bar can therefore start with `undefined`.

## D-16: No highest-absence weekday without absences (2026-10-01)
`highestAbsenceWeekday` is `null` unless some weekday has an absence rate above 0. Otherwise the dashboard would name a weekday with 0% absences as the "highest".

## D-17: Frontend structure (2026-10-01)
- `app/*/page.tsx` are thin server components that set the page title and render a view from `views/`. Views are client components because they use hooks.
- All data fetching is in `lib/queries.ts` (one hook per procedure, already filter-aware). Chart data shaping is in `lib/chart-data.ts`. Formatting is in `lib/format.ts`. Pages and components do no attendance math.
- Filters live in the URL (`?day=1&subject=2`), so they are shared across pages, survive reloads, and nav links carry them along.
- Charts plot rates as percentages. "Absences by day of week" and "late arrivals by hour" plot RATES (counts shown on hover), because counts are biased by how many sessions a weekday or hour has.
- The Dashboard page title is `Dashboard | Presenza` via `title.absolute`, since Next does not apply a layout title template to a page in the same segment.
- `filterOptions` gained `hours` so the hour filter only lists hours that exist in the data.
- Unrequested but within the spec: dashboard cards for students below 80% and highest absence weekday, and a synthetic-data footer (ethics rule). Date-range filtering exists in the API but has no UI, since the spec lists only day, hour, week, month, subject, section.

## D-18: Upload path is a route handler, with stateless preview and commit (2026-10-01)
You chose the upload route. The browser sends the same file twice (`mode=preview`, then `mode=commit`); the server keeps no state between them. The alternative was parsing in the browser and sending rows to tRPC. Rejected because it ships exceljs to the client, needs chunked commits that can fail halfway, and lets preview and commit logic drift apart.

## D-19: Preview is the real import, rolled back (2026-10-01)
Preview runs `importRows()` inside a transaction that is rolled back. Counts are exact and preview and commit cannot disagree. Cost: preview does real writes before rolling back, which is acceptable at semester scale.

## D-20: Libraries (2026-10-01)
- **papaparse** for CSV: handles quoted fields, embedded commas and newlines, a BOM, and mixed line endings; the de facto standard, with TypeScript types.
- **exceljs** for XLSX: reads and writes .xlsx in Node, returns real Date values for date and time cells, and can also build the template workbook, so one library covers both directions. The alternative, SheetJS (`xlsx`), is no longer published to npm (the npm copy is stuck on an old version with known vulnerabilities).
- **zod** (already installed) validates each row.

## D-21: Optional class start/end columns (2026-10-01)
You chose to add optional `class start` and `class end` to the template (10 columns, 8 required). Without a schedule the database cannot hold a session or compute minutesLate. Precedence: existing schedule, then file columns, then inference (earliest time-in rounded to 30 minutes, end +1 hour). Inferred schedules are counted in the preview. `minutes late` is accepted when present but is not in the template.

## D-22: Re-upload semantics (2026-10-01)
A log is identified by student + class session (class + date). Identical, changed, and new rows become unchanged, updated, and created. Soft-deleted matches are revived. The same find-or-revive rule applies to every entity the import creates.

## D-23: Valid rows are imported, invalid rows skipped (approved) (2026-10-01)
The alternative is to refuse the whole file when any row is invalid. Partial import is proposed because the preview already shows exactly what will be skipped.

## D-24: Undo and clear all (2026-10-01)
You chose undo per import plus clear all. Soft delete only. Undo is tracked by `import_batch_id` on logs and a list of created entity ids on the batch. Clear all keeps the calendar scaffolding. Known limit: a log updated by a later import belongs to the later batch. Both need explicit confirmation (typed `CLEAR` for clear all, enforced server-side).

## D-25: Scope note (2026-10-01)
Undo, clear all, and the import history go beyond the paper. You asked for them explicitly. They add one table and one nullable column (DATA_MODEL section 7).


## D-26: Terms are never a reason to reject (2026-10-01)
You said not to reject imports over terms. Resolution order: a live term covering the date; else the term for that period (academic year label + type), revived if soft-deleted, with its start/end extended to include the date; else create it. Extending a term changes its dates, which is the price of never rejecting.

## D-27: Clear all clears everything (2026-10-01)
Supersedes the 'keeps calendar scaffolding' part of D-24. Clear all soft-deletes every live row in every table. The importer therefore find-or-revives all setup rows (academic year, term, calendar date, department, program, building, room, instructor) the same way as the data rows, so a new import rebuilds the system from nothing.

## D-28: Import implementation notes (2026-10-01)
- Timestamps are written with `Date.UTC(...)` so the clock time stored in the `timestamp without time zone` columns equals the time in the file, whatever the server's time zone is (Drizzle sends Dates as UTC). Tested by reading the stored time back as text.
- Student numbers and subject codes are upper-cased; section names have their spaces collapsed and are matched without regard to case.
- Rows are matched to a class session by class + date. A class with two meetings on the same weekday (for example a lecture and a lab) is treated as one schedule: the earliest.
- Validation errors are per row and column. A row with several problems may produce several errors; the "invalid rows" count is rows, not errors.
- Preview and commit both run `importRows()`; preview rolls back. Commit is one transaction, so a database error saves nothing.
- Sections created by an import get a unique letter/year slot automatically (the schema's unique key) when two section names would collide.
- Known limits: undo does not revert a log that a later import updated; `minutes late` is not in the template (accepted if a file has it); one worksheet (the first) is read from an XLSX.
