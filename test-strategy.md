# Test Strategy

Testing approach for the Support Ticket Management System (Core). Maps to `acceptance-criteria.md` and the risk areas called out in `design-notes.md` and `implementation-plan.md`.

## Test scope

| Tier | Tooling | Location | Count | Purpose |
|------|---------|----------|------:|---------|
| **Unit** | Vitest | `backend/tests/ticketStatusService.test.ts` | 35 | State machine — single source of truth |
| **Integration (API)** | Vitest + Supertest + SQLite test DB | `backend/tests/integration/` | 17 | HTTP contracts, validation, check-order precedence, search/filter |
| **Frontend build** | TypeScript + Vite | `frontend/` | — | Type safety and production bundle compile (no component/E2E suite yet) |
| **Manual QA** | Browser against dev stack | `acceptance-criteria.md` | — | UI flows, acting-user dropdown, terminal presentation, error surfacing |

**Out of scope for Core automated tests:** Playwright/Cypress E2E, frontend component tests, load testing, authentication (not implemented).

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

| Acceptance area | Automated coverage | Manual / gap |
|-----------------|-------------------|--------------|
| Valid status transitions (5) | Unit (all 5) + integration happy path | UI button labels |
| Rejected transition classes | Unit (all classes) + integration OPEN→RESOLVED | UI hides invalid options |
| Ticket create/update validation | Integration create tests | UI field errors |
| Terminal read-only (API) | Integration terminal tests | UI read-only presentation |
| Comment rules | Integration comment tests | UI comment form hidden on terminal |
| Search/filter | Integration search tests | UI debounce + empty states |
| `409` stale transition | Integration STATUS_CONFLICT test | UI refetch-and-retry message |
| Acting-user header | Integration INVALID_ACTING_USER | UI dropdown + localStorage |
| Persistence across restart | — | **Not automated** — manual: migrate + seed, restart, verify data |
| True concurrent two-client `409` | Partial — stale `expectedStatus` only | Full race optional Stretch |
| Frontend E2E | — | Manual QA against `ui-flow.md` |

---

## Tests not covered (and why)

| Gap | Reason | Mitigation |
|-----|--------|------------|
| **Persistence / restart integration test** | Scoped out of current suite; SQLite file persistence is inherent to Prisma + migrate/seed workflow | Documented manual check in `test-results.md`; repeatable via `db:migrate` + `db:seed` |
| **Frontend component / E2E tests** | Core mandatory tier is backend integration; UI verified manually per assessment scope | Manual QA checklist; `npm run build` catches TS errors |
| **Unknown enum before DB (e.g. `PENDING`)** | Covered at route Zod layer; integration uses valid enums in happy paths | Could add one integration test in Stretch |
| **Same-state transition via API** | Rejected at service with `400`; not yet a dedicated integration test | Covered by unit same-state tests + service logic |
| **Invalid `assignedToId` FK on create** | Service validation exists; no dedicated integration test yet | Manual / future test |
| **404 on comment for missing ticket** | Not dedicated | Low risk — shared `findTicketOrThrow` |
| **Load / performance** | Out of Core scope | — |

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

## CI recommendation (Stretch)

```yaml
# Suggested — not implemented in Core
- cd backend && npm ci && npm test && npm run test:integration
- cd frontend && npm ci && npm run build
```

---

## Related documents

- `acceptance-criteria.md` — checkbox source of truth
- `api-contract.md` — error codes and check orders under test
- `design-notes.md` — architecture and testing link
- `test-results.md` — latest run output
