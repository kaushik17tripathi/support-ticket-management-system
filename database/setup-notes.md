# Database Setup Notes

SQLite via Prisma 7 with the `@prisma/adapter-better-sqlite3` driver adapter (required in Prisma 7).

## Databases

| Database | Path | Purpose | How it is created |
|----------|------|---------|-------------------|
| **Dev** | `backend/prisma/dev.db` | Local development and manual demos | `npm run db:migrate` + `npm run db:seed` |
| **Test** | `backend/prisma/test.db` | Integration tests only | Wiped and recreated automatically by `npm run test:integration` |

Both databases are gitignored. Only the schema (`backend/prisma/schema.prisma`) and migrations (`backend/prisma/migrations/`) are committed.

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Run all commands from `backend/` unless noted otherwise

## First-time dev database setup

```bash
cd backend
npm install
cp .env.example .env          # Unix — or: copy .env.example .env on Windows
npm run db:generate
npm run db:migrate
npm run db:seed
```

### What each step does

1. **`npm install`** — installs dependencies including `better-sqlite3` and Prisma CLI.
2. **`.env`** — sets `DATABASE_URL=file:./prisma/dev.db` (see `backend/.env.example`).
3. **`npm run db:generate`** — generates the Prisma Client from `prisma/schema.prisma`.
4. **`npm run db:migrate`** — applies committed migrations and creates `prisma/dev.db`.
5. **`npm run db:seed`** — upserts 5 users, 10 tickets, and 6 comments (idempotent; safe to re-run).

Expected seed output:

```text
Seed complete: 5 users, 10 tickets, 6 comments
```

## Re-running seed (dev only)

```bash
cd backend
npm run db:seed
```

Seed uses upsert by stable IDs — it does **not** wipe existing data. To start completely fresh:

```bash
cd backend
rm prisma/dev.db prisma/dev.db-journal    # Unix
# del prisma\dev.db prisma\dev.db-journal  # Windows PowerShell
npm run db:migrate
npm run db:seed
```

On Windows PowerShell:

```powershell
Remove-Item prisma/dev.db, prisma/dev.db-journal -ErrorAction SilentlyContinue
npm run db:migrate
npm run db:seed
```

## Schema changes (developers)

After editing `backend/prisma/schema.prisma`:

```bash
cd backend
npm run db:migrate    # creates/applies a new migration in dev
npm run db:generate   # usually run automatically by migrate dev
```

Commit the new migration folder under `backend/prisma/migrations/`.

## Test database (integration tests)

The test DB is **separate** from dev and is managed by the test suite — do not seed it manually.

```bash
cd backend
npm run test:integration
```

- Sets `DATABASE_URL=file:./prisma/test.db` via `cross-env`
- `tests/integration/setup.ts` deletes `test.db`, runs `prisma migrate deploy`, and seeds exactly two fixed test users from `tests/integration/testUsers.ts`
- Does **not** use `prisma/seed.ts` or dev seed data

## Verify database connectivity

With the dev server running (`npm run dev`):

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

Or list seeded users:

```bash
curl http://localhost:3000/api/users
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./prisma/dev.db` | SQLite file path (relative to `backend/`) |
| `PORT` | `3000` | HTTP port for the Express API |

See `backend/.env.example`. Never commit real `.env` files.

## Seed data reference

Dev seed definitions: `database/seed-data/devSeedData.ts`  
Runner: `backend/prisma/seed.ts`  
Overview: `database/seed-data/README.md`

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `PrismaClientInitializationError` | Missing migration or `.env` | Run `db:migrate`; confirm `DATABASE_URL` in `.env` |
| `better-sqlite3` install failure | Missing build tools on Windows | Install [windows-build-tools](https://github.com/nodejs/node-gyp#on-windows) or use Node 20+ with prebuilds |
| Seed shows 0 records / FK errors | Migrations not applied | `npm run db:migrate` then `npm run db:seed` |
| Integration tests see dev data | Wrong `DATABASE_URL` | Integration script sets test DB automatically; don't point tests at `dev.db` |
| `migrate dev` prompts for migration name | Schema drift | Name the migration or run `npx prisma migrate deploy` for apply-only |
