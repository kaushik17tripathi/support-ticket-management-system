# Test Strategy

Testing approach for the Support Ticket Management System (Core + Stretch). Maps to `acceptance-criteria.md` and the risk areas called out in `design-notes.md` and `implementation-plan.md`.

## Test scope

| Tier | Tooling | Location | Count | Purpose |
|------|---------|----------|------:|---------|
| **Unit** | Vitest | `backend/tests/ticketStatusService.test.ts` | 35 | State machine — single source of truth |
| **Integration (API)** | Vitest + Supertest + SQLite test DB | `backend/tests/integration/` | 17 | HTTP contracts, validation, check-order precedence, search/filter |
| **Frontend build** | TypeScript + Vite | `frontend/` | — | Type safety and production bundle compile |
| **E2E / UI** | Playwright | `e2e/tests/` | 5 | Full UI smoke per `manual-qa-walkthrough.md` |

**Additional coverage:** Manual E2E walkthrough (`manual-qa-walkthrough.md`), frontend production build, persistence restart verification.

---

## Test infrastructure

### Unit tests (`npm test`)

- Config: `backend/vitest.config.ts`
- Includes: `backend/tests/**/*.test.ts`
- Excludes: `backend/tests/integration/**`
- No database — pure functions in `ticketStatusService.ts`

### Integration tests (`npm run test:integration`)

- Config: `backend/vitest.integration.config.ts`
- `globalSetup`: `backend/tests/integration/setup.ts`
  - Deletes `backend/prisma/test.db`
  - Runs `prisma migrate deploy`
  - Seeds **two fixed users** from `testUsers.ts` (not `prisma/seed.ts`)
- `fileParallelism: false` — avoids SQLite contention on shared test DB
- App: `createApp()` via `testApp.ts` (same factory as production)
- Isolation: `beforeEach(() => prisma.ticket.deleteMany())` in `tickets.test.ts` — tickets wiped per test; users persist for the suite

### Dev vs test databases

| DB | Path | Used by |
|----|------|---------|
| Dev | `backend/prisma/dev.db` | `npm run dev`, manual UI QA, seed data |
| Test | `backend/prisma/test.db` | Integration tests only |

See `database/setup-notes.md`.

---

## Unit tests — `TicketStatusService`

**File:** `backend/tests/ticketStatusService.test.ts`  
**Target:** `backend/src/services/ticketStatusService.ts`

### `canTransition(from, to)`

| Category | Cases covered |
|----------|---------------|
| **Valid (5)** | OPEN→IN_PROGRESS, OPEN→CANCELLED, IN_PROGRESS→RESOLVED, IN_PROGRESS→CANCELLED, RESOLVED→CLOSED |
| **Skip-ahead** | OPEN→RESOLVED, OPEN→CLOSED, IN_PROGRESS→CLOSED |
| **Backward / reopen** | IN_PROGRESS→OPEN, RESOLVED→OPEN, RESOLVED→IN_PROGRESS |
| **Late cancel** | RESOLVED→CANCELLED |
| **Terminal outbound (8)** | CLOSED→*, CANCELLED→* (all four targets each) |
| **Same-state (5)** | Each status→itself returns `false` |

Each transition is an **explicit test** (no loops) so failures name the exact edge case.

### `getAllowedTransitions(from)`

- OPEN → `[IN_PROGRESS, CANCELLED]`
- IN_PROGRESS → `[RESOLVED, CANCELLED]`
- RESOLVED → `[CLOSED]`
- CLOSED / CANCELLED → `[]`

### `isTerminal(status)`

- Non-terminal: OPEN, IN_PROGRESS, RESOLVED → `false`
- Terminal: CLOSED, CANCELLED → `true`
- Derived from transition map (empty allowed list), not a separate hardcoded set

---

## Integration tests — API via Supertest

**Files:** `backend/tests/integration/health.test.ts`, `tickets.test.ts`

### Smoke (`health.test.ts`)

- `GET /api/users` returns the two seeded test users

### State machine via HTTP (`tickets.test.ts`)

Proves the API enforces the state machine end-to-end (not by re-testing `ticketStatusService` in isolation):

| Test | Asserts |
|------|---------|
| Happy path | OPEN → IN_PROGRESS → RESOLVED → CLOSED with `allowedStatuses` at each step |
| Invalid transition | OPEN → RESOLVED → `422 INVALID_STATUS_TRANSITION` |
| Terminal precedence | CLOSED ticket + stale `expectedStatus` → `422 TERMINAL_TICKET_READ_ONLY` (**not** `409`) |
| Concurrency | Stale `expectedStatus` on non-terminal ticket → `409 STATUS_CONFLICT` |

The terminal-before-409 test directly validates `api-contract.md` check-order for `PATCH /tickets/:id/status`.

### Validation

| Test | Asserts |
|------|---------|
| Missing title on create | `400 VALIDATION_ERROR` + field-level `details` |
| `assignedToId: ""` on create | `400 VALIDATION_ERROR` (empty-string regression) |
| Invalid priority | `400 VALIDATION_ERROR` |
| Missing `X-Acting-User-Id` | `400 INVALID_ACTING_USER` |

### Terminal read-only

| Test | Asserts |
|------|---------|
| PATCH fields on CLOSED ticket | `422 TERMINAL_TICKET_READ_ONLY` |
| POST comment on CANCELLED ticket | `422 TERMINAL_TICKET_READ_ONLY` |

### Comments

| Test | Asserts |
|------|---------|
| Add comment | `201`; comment appears in `GET /tickets/:id` |
| Empty message | `400 VALIDATION_ERROR` |

### Search and filter

| Test | Asserts |
|------|---------|
| Case-insensitive search | `search=login` matches title `Login Issue` |
| Literal special characters | `%`, `_`, `\` in query match literally (decoy tickets prove no wildcard expansion) |
| Combined filter | `search` + `status` together |
| Empty search | Returns all tickets, subject to status filter |

---

## Acceptance criteria mapping

| Acceptance area | Coverage |
|-----------------|----------|
| Valid status transitions (5) | Unit (all 5) + integration happy path + UI buttons from `allowedStatuses` |
| Rejected transition classes | Unit (all classes) + integration + UI hides invalid options |
| Ticket create/update validation | Integration tests + UI field-level errors |
| Terminal read-only | Integration API tests + UI read-only presentation |
| Comment rules | Integration tests + UI comment form on non-terminal only |
| Search/filter | Integration tests + UI debounce and empty states |
| `409` stale transition | Integration STATUS_CONFLICT + UI refetch-and-retry |
| Acting-user header | Integration INVALID_ACTING_USER + dropdown + `localStorage` |
| Persistence across restart | Manual QA section H + repeatable smoke in `test-results.md` |
| Concurrent status updates | Integration stale `expectedStatus` + optional two-tab UI test (section G3) |
| Frontend E2E | `manual-qa-walkthrough.md` sections A–I |

All items mapped in `acceptance-criteria.md` (fully checked).

---

## How to run

From `backend/`:

```bash
npm test                  # unit — fast, no DB setup
npm run test:integration  # integration — wipes test.db, migrates, seeds 2 users
```

From `frontend/`:

```bash
npm run build             # typecheck + production bundle
```

Full stack manual smoke:

1. `backend`: `npm run dev` (port 3000)
2. `frontend`: `npm run dev` (port 5173, proxies `/api`)
3. Select acting user → create ticket → transition → comment → search

---

## CI pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
- cd backend && npm ci && npm test && npm run test:integration
- cd frontend && npm ci && npm run build
```

Run locally via commands in **How to run** above; full results in `test-results.md`.

---

## Related documents

- `acceptance-criteria.md` — checkbox source of truth
- `api-contract.md` — error codes and check orders under test
- `design-notes.md` — architecture and testing link
- `test-results.md` — latest run output
