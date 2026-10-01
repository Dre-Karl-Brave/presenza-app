# Presenza

Presenza is an attendance analytics system. It turns class attendance records into rates, trends, comparisons, and reports. It uses synthetic data only. See `PRESENZA_SPEC.md` for scope and `docs/` for the plan, data model, API, decisions, and progress.

Stack: Next.js, React, tRPC, Drizzle ORM, PostgreSQL, Recharts.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Apply the schema to your database: `npm run db:push`.
4. `npm run dev` and open http://localhost:3000.
5. Load data on the **Import** page (download the CSV or XLSX template, fill it in, upload). It shows a preview before saving, and every import can be undone.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app |
| `npm run build` | Production build |
| `npm test` | Run the tests (in-memory database, never touches yours) |
| `npm run db:push` | Push `db/schema/` to the database |
| `npm run db:studio` | Browse the database |

## Layout

- `db/` Drizzle schema and client
- `server/services/analytics/` every number, one formula (`formulas.ts`)
- `server/routers/` tRPC API
- `lib/`, `components/`, `views/`, `app/` frontend; all styling is in `app/theme.css`
- `tests/` tests and their fixtures
