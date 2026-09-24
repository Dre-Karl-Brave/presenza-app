# Database (Drizzle + Postgres)

- `db/schema.ts` — table definitions live here
- `db/index.ts` — exports the `db` client, import this to query
- `drizzle.config.ts` — drizzle-kit config (schema location, migrations output, db credentials)
- `db/migrations/` — generated SQL migration files (created by `db:generate`)

Requires `DATABASE_URL` in `.env` (see `.env.example`).

## Commands

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Generate SQL migration files from changes in `db/schema.ts` |
| `npm run db:migrate` | Apply pending migration files to the database |
| `npm run db:push` | Push `db/schema.ts` straight to the database, no migration files (good for local prototyping) |
| `npm run db:pull` | Introspect an existing database and write a schema file from it |
| `npm run db:studio` | Open Drizzle Studio to browse/edit data in the browser |

## Typical workflow

1. Edit `db/schema.ts`
2. `npm run db:generate` to create a migration
3. `npm run db:migrate` to apply it
