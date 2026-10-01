# Presenza: Plan

Presenza is an attendance analytics system for one synthetic semester. See `PRESENZA_SPEC.md` for scope. This plan covers architecture, folder structure, build order, and open questions. It was written before any application code.

Status: **Step 1 approved ("continue"). Step 2 backend built; waiting on the database migration and review before Step 3.** Progress lives in `docs/PROGRESS.md`.

## 1. Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript strict | Already in the repo. `AGENTS.md` says this Next.js has breaking changes, so `node_modules/next/dist/docs/` must be read before writing route or layout code. `node_modules` is not installed yet; first action after approval is `npm install`, then read those docs. |
| API | tRPC v11 over the fetch adapter at `app/api/trpc/[trpc]/route.ts` | Client uses `@trpc/tanstack-react-query` + `@tanstack/react-query`. Input validation with `zod`. |
| Database | PostgreSQL via **Drizzle ORM** (already in the repo) | You chose to keep Drizzle and drop Prisma. See DECISIONS D-01. |
| Charts | Recharts | Line and bar charts. Status breakdown is a bar chart (see Open Questions). |
| Tests | Vitest + PGlite (in-memory Postgres) | Fixture lives only in `tests/`. See DECISIONS D-07. |
| Auth | None | Out of scope. |

## 2. Architecture

```
Browser (React pages, no business logic)
   │  tRPC hooks (lib/trpc)
   ▼
app/api/trpc/[trpc]/route.ts   fetch adapter
   ▼
server/routers/*               thin: validate input with zod, call a service, return result
   ▼
server/services/analytics/*    ALL calculations and queries (single source of truth)
server/services/import/*       Step 3B: the single import path
   ▼
db/ (Drizzle schema + client)  PostgreSQL
```

Rules:

1. Routers contain no formulas. Pages contain no formulas and no colors.
2. Rates are computed in exactly one function (`rates()` in `server/services/analytics/formulas.ts`). SQL only does `COUNT ... GROUP BY status`; TypeScript turns counts into rates. Every endpoint reuses it.
3. Every query goes through shared filter and soft-delete helpers (`filters.ts`), so `deleted = false` and the six filters behave identically everywhere.
4. Dates cross the API as `YYYY-MM-DD` strings, never `Date` objects, so no superjson and no timezone drift.
5. The seed (Step 4) will call the import service. It must not touch tables directly.

## 3. Folder structure

Only new or changed items are shown. Existing `db/` stays.

```
docs/                       PLAN, DATA_MODEL, API, DECISIONS, PROGRESS
app/
  layout.tsx                Presenza title template, NavBar, "synthetic data" footer
  theme.css                 ALL design tokens (CSS variables) and component classes
  page.tsx                  Dashboard
  trends/page.tsx
  comparisons/page.tsx
  reports/page.tsx
  import/page.tsx           Step 3B
  api/trpc/[trpc]/route.ts
components/                 NavBar, StatCard, ChartCard, FilterBar, DataTable, LoadingState, EmptyState, ErrorState, charts/ (LineTrendChart, BarComparisonChart)
lib/
  trpc.ts                   client + provider
  filters.ts                filter state <-> URL search params (so filters are shareable and shared across pages)
  format.ts                 percent/number formatting (presentation only)
  chart-theme.ts            returns var(--chart-N) strings, never hex
server/
  trpc.ts                   init, context
  routers/                  analytics.ts, import.ts (3B), root.ts
  services/
    analytics/              formulas.ts, filters.ts, queries.ts, index.ts, types.ts
    import/                 Step 3B
tests/
  analytics/                fixture.ts (hand-made data, in-memory DB only) + *.test.ts
  import/                   Step 3B fixtures (csv/xlsx) + tests
```

## 4. Build order

Small steps. After each one: update `PROGRESS.md`, summarize.

**Step 2: schema and analytics (no UI, no seed)**
1. `npm install`; read the Next.js docs in `node_modules/next/dist/docs/`.
2. Add `deleted` to every table and the filter indexes in `db/schema/`. Generate the migration file only; **you run it** (command in Section 6).
3. `formulas.ts` + its tests (pure, fastest feedback).
4. `filters.ts` (shared WHERE builder incl. soft-delete).
5. `queries.ts` + service functions, one at a time, each with tests: summary, status breakdown, trends, day of week, hour, subject/section, student report, low attendance.
6. tRPC init, routers, route handler.
7. Update API.md/DECISIONS.md with anything that changed.

**Step 3: frontend**
1. Rename package to `presenza`, fix metadata, add `theme.css`.
2. Components: NavBar, StatCard, ChartCard, FilterBar, DataTable, states.
3. Pages in order: Dashboard, Trends, Comparisons, Reports.
4. Verify empty states render on an empty DB.

**Step 3B: file import** (docs first, then wait for approval, then code)
1. Update PLAN/API/DECISIONS with the upload transport choice and import design.
2. Import service (validate with zod, match or create, upsert logs), tests with fixture files.
3. Template download, preview + confirm, Import page.

**Step 4: seed** (only when you say so, and I will ask you to confirm first)
1. Generator (Faker, fixed seed) that outputs rows in the import format.
2. Runs them through the import service. Prints record counts.

## 5. Things I noticed in the repo

- The repo already contains a 19-table Drizzle schema and relations. Your 7 entities map onto it (see `DATA_MODEL.md`). The extra tables carry the holidays, suspensions, and exam periods the spec needs.
- `db/seed.ts` is a placeholder that writes one row per table directly. It conflicts with the "seed must go through the import service" rule. I will not touch or run it until Step 4, when it is replaced. Please do not run `npm run db:seed` meanwhile; it would put non-fixture rows in the real DB.
- `db/README.md` is stale (mentions `db/schema.ts`). I will fix it when I touch the schema.
- `app/layout.tsx` still says "Create Next App". Fixed in Step 3.
- `package.json` name is `presenza-app`; it becomes `presenza` in Step 3.

## 6. Commands you will run

I do not run migrations. After Step 2.2 I will tell you which one applies:

```
npm run db:generate    # I may run this: it only writes SQL files, no database change
npm run db:migrate     # you run this
```

## 7. Open questions (need your answer)

1. **Migration workflow.** Have you been using `db:push` or `db:generate` + `db:migrate`? There is no `db/migrations/` folder in git. I recommend generate + migrate, since adding `deleted` to 19 tables is easier to review as SQL. OK?
2. ~~**Day-of-week column.**~~ **Resolved:** you said the database is set up beforehand and I may modify the schema as needed. I will add a denormalized `day_of_week` (+ index) on `class_sessions`. Since the DB already exists, the new column and `deleted` columns need a migration that you run. For existing rows, the migration must backfill `day_of_week`; I will include that SQL for you to review.
3. **Test database.** Recommended: PGlite (real Postgres in memory, so SQL grouping and filters are really tested, and nothing can touch the real DB because no connection string is involved). Alternative: pure TS functions over arrays only (simpler, but SQL is untested). Fine with PGlite? If it does not work with Drizzle 1.0 RC, I will fall back and log it.
4. **Styling.** Tailwind v4 is already installed. Recommended: keep it, but define all tokens in `app/theme.css` (`@theme` variables like `--color-surface`, `--color-chart-1`) and use only semantic classes. Pages never contain hex values or palette classes like `bg-blue-500`. Alternative: drop Tailwind use and write plain CSS classes. Which do you prefer?
5. **Status breakdown chart.** The spec says "share of present, late, absent, excused" without naming a chart type, and the required-charts rule only names line and bar. I recommend a single horizontal stacked bar (stays within line/bar). A pie/donut would be a scope addition, so I am not using one unless you say so.
6. **Paper figures.** The spec lists "weekday with highest absence rate" and "number of students below 80 percent" as figures to read off the system. I plan to expose them on the Dashboard summary (4 extra small fields) so no one computes them by hand. Also, add a "Dataset is synthetic" footer (ethics rule). Both within the spec; confirming since they add visible UI.
7. **Import vs. required reference data (affects 3B and 4).** The import template has only: student number, student name, subject code, section, date, time in, time out, status. The schema also requires program, department, instructor, term, room, class, and schedule. For rows that reference things that do not exist yet, the import service needs defaults or a bootstrap. Also, holidays and suspensions are not in the template. I will propose a concrete design in the 3B plan; flagging now so it is not a surprise.
8. **Low-attendance threshold.** Fixed at 80% as a constant per the spec, not a user input. OK?

---

# Step 3B: File upload import (plan, awaiting approval)

Your decisions: **upload route**, **2 optional class-time columns**, **undo one import + clear all**. Seeding (Step 4) is on hold; the database will be populated by importing files.

## 8. Transport: upload route (chosen)

| | Upload route (chosen) | Parse in browser |
| --- | --- | --- |
| Parsing | papaparse + exceljs run on the server | both libraries ship to the browser (exceljs is ~1 MB) |
| Preview then confirm | the browser POSTs the same `File` twice: `mode=preview`, then `mode=commit`. No state kept on the server | rows held in the browser, sent to tRPC in chunks |
| Large file | one request | many requests; partial failure between chunks |
| Atomicity | whole commit is one DB transaction | per chunk |
| tRPC purity | import history/undo/clear still use tRPC | everything in tRPC |

Why the route wins: it is stateless and atomic, and the same server code validates, previews, and commits, so the preview cannot disagree with the commit. Cost: one non-tRPC endpoint. The file is never written to disk.

## 9. One import path

```
POST /api/import  ->  parse (papaparse | exceljs)  ->  validate rows (zod)  ->  importRows(db, rows)  ->  DB
Step 4 seed       ->  generate rows in memory     ------------------------->  importRows(db, rows)
```

`importRows()` is the only code that writes attendance data. Preview runs the exact same function inside a transaction that is rolled back, so preview counts are real, not estimates.

New files:

```
server/services/import/
  columns.ts       header aliases, template columns
  parse.ts         CSV (papaparse) and XLSX (exceljs) -> raw rows with spreadsheet row numbers
  row-schema.ts    zod schema: one row -> typed row or errors by column
  validate.ts      all rows + cross-row checks (duplicates, conflicting class times)
  names.ts         "Last, First" / "First Last" splitting
  dates.ts         one place for weekStart, monthStart, isoWeek, day names, term slots
  import-rows.ts   importRows(): match/create/revive, schedules, sessions, logs, batch record
  undo.ts          undo one batch, clear all
  template.ts      builds the CSV / XLSX template
app/api/import/route.ts             POST preview|commit
app/api/import/template/route.ts    GET csv|xlsx
server/routers/import.ts            history, undo, clearAll
views/ImportView.tsx, app/import/page.tsx
tests/import/                       fixtures/*.csv, *.xlsx and tests
```

## 10. Template and row rules

Template columns, in order. The first 8 are required; the last 2 are optional:

`student number | student name | subject code | section | date | time in | time out | status | class start | class end`

Also accepted when present, but not in the template: `minutes late`.

Headers match case-insensitively and ignore spaces, underscores, and punctuation (`Student No.` and `student_number` both work). A missing required header rejects the whole file and lists what is missing. Extra columns are ignored. XLSX reads the first worksheet only. Errors name the **spreadsheet row** (header = row 1, first data row = row 2) and the **column**.

| Column | Rule |
| --- | --- |
| student number | required, text up to 20 chars (numeric XLSX cells converted to text) |
| student name | required; `Last, First` if it has a comma, otherwise the last word is the last name |
| subject code | required, up to 15 chars |
| section | required, up to 30 chars (the section name, e.g. `BSIT 3-A`) |
| date | `YYYY-MM-DD`, or a real date cell in XLSX |
| time in / time out | `HH:MM` or `HH:MM:SS`, or a time cell. `time in` is required for present and late; both are ignored for absent and excused. `time out` must not be before `time in` |
| status | `present`, `late`, `absent`, `excused` (any case) |
| class start / class end | optional `HH:MM`; give both or neither; end after start |
| minutes late | optional whole number 0 to 600 |

Cross-row checks: the same student on the same class and date twice makes the later row invalid ("duplicate of row N"); one class and date given two different class times makes the later row invalid.

Limits: `.csv` and `.xlsx` only, 10 MB, 100,000 rows.

## 11. Matching and creating

| Thing | Matched by | If missing |
| --- | --- | --- |
| Student | student number | created in a default program (below), year level 1. Existing students are never renamed |
| Subject | subject code | created, title = code, type major, default department |
| Term | a live term covering the date, else the term for that period (academic year + type), even if soft-deleted | created from the date: Aug to Dec is first semester of `Y-(Y+1)`, Jan to May is second semester, Jun to Jul is summer. If that term already exists it is revived if deleted and its start/end are **extended** to cover the date. A date is never rejected because of terms |
| Section | section name within the term | created in the default program. Letter = text after the last `-` or space; year level = first digit in the name, else 1 |
| Class | subject + section + term | created with the default instructor; class code generated, shortened with a hash if over 20 chars |
| Schedule | class + weekday | see below |
| Session | class + date | created `held`; fills `start_hour`, `day_of_week`, `week_start`, `month_start` and the calendar date row |
| Section link | section + student | created so the Student report can show the section |
| Attendance log | **student + session** | created, updated, or left unchanged |

Default scaffolding created on first use: department `IMP` ("Imported"), program `IMP`, instructor `IMPORT` ("Unassigned"), building `IMP`, room `IMP-1`. Nothing about real people is invented; names come only from the file.

**Schedule rule.** An existing schedule for the class and weekday always wins. Otherwise use `class start` / `class end` from the file. If those are blank, infer: start = earliest time-in that weekday rounded to the nearest 30 minutes, end = start + 1 hour. The preview counts inferred schedules so you can see it happened.

**minutesLate.** Uses the file's `minutes late` if given; else for `late` status, the minutes from the schedule start to time-in (never below 0); else 0. The importer also fills `time_in_hour`, `time_out_hour`, `minutes_in_class`, `left_early`, and sets `log_method = manual`.

**Re-upload safety.** A log is identified by student + class session, so re-uploading never doubles anything: identical rows are **unchanged**, changed rows are **updated**, new rows are **created**. If the earlier row was soft-deleted, it is **revived** (the same applies to students, subjects, sections, classes, schedules, and sessions), because the unique constraints still cover soft-deleted rows.

Rows that match a cancelled session are invalid ("session is cancelled").

## 12. Preview, confirm, commit

1. Choose a file. The browser POSTs it with `mode=preview`. Nothing is saved.
2. The preview shows rows read, valid, and invalid; what would be created, updated, and unchanged; new students, subjects, sections, classes, and sessions; inferred schedules; the first 200 errors (row, column, message); and a 10-row sample.
3. **Import N valid rows** POSTs the same file with `mode=commit`. Valid rows are imported and invalid rows are skipped, all in one transaction (all or nothing on a database error). The button is disabled if there are zero valid rows.

## 13. Undo and clear all

Everything is a soft delete (`deleted = true`).

- **Import history**: each commit writes an `import_batches` row (file name, counts, and the ids of the students, subjects, sections, classes, schedules, sessions, and section links it created). Logs get `import_batch_id`.
- **Undo one import**: soft-deletes the logs tagged with that batch, then soft-deletes the entities that batch created if nothing live still depends on them (a student with no other live logs, a session with no live logs, and so on). Things created by other imports are never touched. Limit: if a later import updated a log, that log now belongs to the later batch, so undoing the earlier batch will not remove it.
- **Clear all data**: soft-deletes every live row in **all** tables: attendance logs, sessions, schedules, classes, class enrollments, section links, students, sections, subjects, instructors, import batches, and also the calendar and organization setup (academic years, terms, calendar dates and events, departments, programs, buildings, rooms, curriculum links). Nothing is left behind, including the placeholder row currently in your database. The next import recreates (or revives) whatever it needs.
- Both ask for confirmation: undo uses a two-step button; clear all requires typing `CLEAR`, and the server rejects the call without it.

## 14. Import page (`/import`)

The nav gets an **Import** link. Same theme and components. Sections: (1) download template (CSV or XLSX), (2) choose file, (3) preview with `StatCard`s and an errors `DataTable`, (4) Import button and a result summary linking to the Dashboard, (5) import history with Undo, (6) a danger card for Clear all. New CSS goes only in `app/theme.css`.

## 15. Build order for 3B

1. Schema: `import_batches` table + `attendance_logs.import_batch_id`. Additive; **you run `db:push`** (no backfill needed).
2. `npm install papaparse exceljs` (+ `@types/papaparse`).
3. dates, names, columns, row-schema, validate (with tests).
4. parse CSV/XLSX + fixtures (tests).
5. `importRows` (tests: create, idempotent re-upload, update, revive, minutesLate, schedules, preview rollback).
6. undo + clearAll (tests), tRPC import router.
7. Upload and template routes.
8. Import page; build; check in the browser.
9. Update PROGRESS and DECISIONS. Step 4 stays on hold.

## 16. Decisions on the 3B questions (answered)

1. **Terms:** never reject an import because of terms. If the term for the period exists, it is revived and extended to cover the date; otherwise it is created.
2. **Partial import:** valid rows are imported and invalid rows skipped. This needs no extra database column.
3. **Clear all** clears everything (see section 13). A new import is needed to fill the setup tables again, so the importer find-or-revives every setup row too: academic year, term, calendar date, department, program, building, room, instructor.
