# Seed Data

Application seed data for local development and manual demo runs lives in `backend/prisma/seed.ts` and is applied via `npm run db:seed` against the **dev** database (`backend/prisma/dev.db` by default).

## Test database (integration tests)

Integration tests use a **separate** SQLite database at `backend/prisma/test.db`, configured by the `test:integration` script:

```bash
npm run test:integration
```

- `DATABASE_URL=file:./prisma/test.db` (set via `cross-env` in the npm script)
- Wiped and migrated before each suite run by `backend/tests/integration/setup.ts` (deletes `test.db`, then `prisma migrate deploy`; test users seeded explicitly — not via `seed.ts`)
- Seeded with exactly two fixed test users from `backend/tests/integration/testUsers.ts` — **not** from `seed.ts`

The test database is ephemeral test infrastructure. It is not used for manual running or demoing the app, and `test.db` must not be committed (covered by `*.db` in `.gitignore`).
