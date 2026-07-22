# Seed Data

Application seed data for local development and manual demo runs lives in:

- **`database/seed-data/devSeedData.ts`** — stable record definitions (users, tickets, comments)
- **`backend/prisma/seed.ts`** — idempotent upsert runner (`npm run db:seed`)

Applied against the **dev** database (`backend/prisma/dev.db` by default).

## Dev seed contents

| Entity | Count | Notes |
|--------|------:|-------|
| Users | 5 | Roles: `agent`, `admin`, `manager`, `engineer` |
| Tickets | 10 | All five statuses; all four priorities; mix of assigned/unassigned |
| Comments | 6 | On non-terminal tickets only (`OPEN`, `IN_PROGRESS`, `RESOLVED`) |

Includes a **Login Issue** ticket for keyword-search demos and realistic titles/descriptions.

Re-running `npm run db:seed` is safe — records are upserted by stable `id`, not wiped.

```bash
cd backend
npm run db:migrate   # first time / after schema changes
npm run db:seed
```

## Test database (integration tests)

Integration tests use a **separate** SQLite database at `backend/prisma/test.db`, configured by the `test:integration` script:

```bash
npm run test:integration
```

- `DATABASE_URL=file:./prisma/test.db` (set via `cross-env` in the npm script)
- Wiped and migrated before each suite run by `backend/tests/integration/setup.ts` (deletes `test.db`, then `prisma migrate deploy`; test users seeded explicitly — not via `seed.ts`)
- Seeded with exactly two fixed test users from `backend/tests/integration/testUsers.ts` — **not** from `seed.ts`

The test database is ephemeral test infrastructure. It is not used for manual running or demoing the app, and `test.db` must not be committed (covered by `*.db` in `.gitignore`).
