# Test Results

Latest verified run on **23 July 2026** (local Windows environment). Commands run from repository root subdirectories as shown.

## Summary

| Suite | Command | Result | Tests | Duration |
|-------|---------|--------|------:|----------|
| Unit (state machine) | `cd backend && npm test` | **PASS** | 35/35 | ~416 ms |
| Integration (API) | `cd backend && npm run test:integration` | **PASS** | 17/17 | ~6.5 s |
| Frontend build | `cd frontend && npm run build` | **PASS** | — | ~1.5 s (vite build) |

**Total automated backend tests: 52 passed, 0 failed.**

---

## Unit tests — `npm test`

```
> backend@1.0.0 test
> vitest run

 RUN  v4.1.10 C:/Users/Kaushik Tripathi/Desktop/support-ticket-management-system/backend

 Test Files  1 passed (1)
      Tests  35 passed (35)
   Start at  02:40:56
   Duration  416ms (transform 61ms, setup 0ms, import 128ms, tests 13ms, environment 0ms)
```

**File:** `backend/tests/ticketStatusService.test.ts`

| Describe block | Tests |
|----------------|------:|
| `canTransition` — valid transitions | 5 |
| `canTransition` — skip-ahead | 3 |
| `canTransition` — backward/reopen | 3 |
| `canTransition` — late cancel | 1 |
| `canTransition` — terminal outbound | 8 |
| `canTransition` — same-state | 5 |
| `getAllowedTransitions` | 5 |
| `isTerminal` | 5 |

---

## Integration tests — `npm run test:integration`

```
> backend@1.0.0 test:integration
> cross-env DATABASE_URL=file:./prisma/test.db vitest run --config vitest.integration.config.ts tests/integration

 RUN  v4.1.10 C:/Users/Kaushik Tripathi/Desktop/support-ticket-management-system/backend

Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma\schema.prisma.
Datasource "db": SQLite database "test.db" at "file:./prisma/test.db"

SQLite database test.db created at file:./prisma/test.db

1 migration found in prisma/migrations

Applying migration `20260722091246_init`

The following migration(s) have been applied:

migrations/
  └─ 20260722091246_init/
    └─ migration.sql

All migrations have been successfully applied.

 Test Files  2 passed (2)
      Tests  17 passed (17)
   Start at  02:40:57
   Duration  6.50s (transform 153ms, setup 0ms, import 1.13s, tests 1.23s, environment 0ms)
```

### `health.test.ts` (1 test)

- `returns seeded test users` — `GET /api/users` returns `test_user_agent` and `test_user_admin`

### `tickets.test.ts` (16 tests)

| Group | Tests | Status |
|-------|------:|--------|
| State machine via API | 4 | PASS |
| Validation via API | 4 | PASS |
| Terminal read-only via API | 2 | PASS |
| Comments via API | 2 | PASS |
| Search and filter via API | 4 | PASS |

Notable passing cases:

- **Check-order precedence:** CLOSED ticket + stale `expectedStatus` → `422 TERMINAL_TICKET_READ_ONLY` (not `409`)
- **LIKE escaping:** literal `%`, `_`, `\` in search with decoy tickets — correct single-match results, no server error
- **Empty-string regression:** `assignedToId: ""` → `400 VALIDATION_ERROR`

---

## Frontend build — `npm run build`

```
> frontend@0.0.0 build
> tsc -b && vite build

vite v6.4.3 building for production...
✓ 52 modules transformed.
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-DfqlNmlr.css    5.41 kB │ gzip:  1.79 kB
dist/assets/index-CKiCeaGw.js   252.06 kB │ gzip: 79.69 kB
✓ built in 1.51s
```

TypeScript strict check and production bundle succeed. No automated UI/E2E suite in Core.

---

## Manual QA (pending formal sign-off)

Use **[manual-qa-walkthrough.md](./manual-qa-walkthrough.md)** — structured steps A–I mapping to `acceptance-criteria.md`.

The following items rely on manual verification with both servers running:

- [ ] Acting-user dropdown persists across reload (`localStorage`)
- [ ] UI status buttons match `allowedStatuses` only (no client-side state machine)
- [ ] Terminal tickets: read-only banner, no edit/transition/comment controls
- [ ] `409` on status change shows refetch message; user can retry
- [ ] Empty list vs no-search-results empty states
- [ ] Data persists after backend restart (`dev.db` + seed)

Run manual pass and check boxes in `acceptance-criteria.md` when complete.

---

## Persistence smoke (manual, repeatable)

Not automated. To verify data survives restart:

```bash
cd backend
npm run db:migrate
npm run db:seed
# stop and restart npm run dev
curl http://localhost:3000/api/tickets
# expect seeded tickets still present
```

---

## How to reproduce

```bash
cd backend
npm install
npm test
npm run test:integration

cd ../frontend
npm install
npm run build
```

Integration tests require no prior `test.db` — setup wipes and recreates it each run.
