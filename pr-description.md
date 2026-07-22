# PR Description

## Summary

Implements the **Core** Support Ticket Management System: a full-stack app for creating, searching, updating, and progressing support tickets through an enforced lifecycle, with comments on non-terminal tickets.

- **Backend:** Express + TypeScript + Prisma 7 (SQLite) + Zod validation
- **Frontend:** React + Vite + TypeScript, consuming `allowedStatuses` from the API (no client-side state machine)
- **Tests:** 35 unit + 17 integration (52 total), all passing
- **Docs:** Requirements through test results, debugging/review logs, prompt history

Repository uses `backend/` and `frontend/` at root (documented deviation from template). See `design-notes.md`.

---

## Features Implemented

### Tickets
- Create with `title`, `description`, `priority` (required, no default), optional assignee
- List with case-insensitive keyword search (`title` + `description`) and single-status filter
- View detail with comments (oldest first) and `allowedStatuses` for UI controls
- Update fields on non-terminal tickets (`title`, `description`, `priority`, `assignedToId` including clear to null)
- Status transitions via state machine with optimistic concurrency (`expectedStatus` → `409` on conflict)

### State machine (backend-enforced)
```
OPEN         → IN_PROGRESS, CANCELLED
IN_PROGRESS  → RESOLVED, CANCELLED
RESOLVED     → CLOSED
CLOSED       → (terminal)
CANCELLED    → (terminal)
```

### Comments
- Add to non-terminal tickets only
- Terminal tickets (`CLOSED` / `CANCELLED`) fully read-only — no edits, transitions, or new comments

### Acting user (no auth)
- Dropdown of seeded users (`GET /users`)
- `X-Acting-User-Id` on all mutating API calls
- Frontend persists selection in `localStorage`

### Frontend (per `ui-flow.md`)
- Ticket list, create form, detail view/edit, status actions from `allowedStatuses`, comment form
- Terminal ticket read-only presentation
- Error handling for all `api-contract.md` codes including `409` refetch-and-retry flow

---

## Technical Changes

### Backend (`backend/`)
| Area | Files |
|------|-------|
| State machine | `src/services/ticketStatusService.ts` |
| Business logic | `src/services/ticketService.ts`, `commentService.ts`, `userValidation.ts` |
| API routes | `src/routes/tickets.ts`, `users.ts` |
| Middleware | `actingUser.ts`, `errorHandler.ts`, `validate.ts` |
| Validation | `src/validation/ticketValidation.ts` |
| App factory | `src/app.ts`, `src/index.ts` |
| Tests | `tests/ticketStatusService.test.ts`, `tests/integration/` |

### Frontend (`frontend/`)
| Area | Files |
|------|-------|
| API client | `src/api/client.ts`, `types.ts` |
| Acting user | `src/context/ActingUserContext.tsx` |
| Pages | `TicketListPage`, `CreateTicketPage`, `TicketDetailPage` |
| Routing | `src/App.tsx` (React Router) |

### Key design decisions
- **Single source of truth:** transition rules only in `ticketStatusService.ts`; UI mirrors `allowedStatuses`
- **Check-order precedence:** terminal ticket → `422` before `409` on stale `expectedStatus` (per `api-contract.md`)
- **Search:** literal substring match (SQLite `LIKE` escaping insufficient without `ESCAPE` clause)
- **Concurrency:** atomic `updateMany` with status match in `transitionStatus`

---

## Database Changes

- **Schema:** `backend/prisma/schema.prisma` — `User`, `Ticket`, `Comment`, `Priority`, `TicketStatus` enums
- **Migration:** `backend/prisma/migrations/20260722091246_init/`
- **Dev seed:** `database/seed-data/devSeedData.ts` + `backend/prisma/seed.ts` (5 users, 10 tickets, 6 comments, idempotent upsert)
- **Test seed:** `tests/integration/setup.ts` (2 fixed users, separate `test.db`)

Setup: `database/setup-notes.md`, `README.md`

---

## Testing Done

| Suite | Command | Result |
|-------|---------|--------|
| Unit | `cd backend && npm test` | 35/35 pass |
| Integration | `cd backend && npm run test:integration` | 17/17 pass |
| Frontend build | `cd frontend && npm run build` | Pass |

High-risk cases covered:
- All valid + rejected transition classes (unit)
- Terminal-before-409 check-order precedence (integration)
- Empty-string `assignedToId` regression (integration)
- Search literal `%`, `_`, `\` with decoy tickets (integration)

Details: `test-strategy.md`, `test-results.md`

Manual UI QA: checklist in `test-results.md` (pending formal sign-off).

---

## AI Usage Summary

- **Tool:** Cursor (primary)
- **Approach:** Spec-first — requirements → API contract → data model → implementation prompts
- **Review discipline:** Every generation reviewed against committed docs; 4 `fix(ai-catch)` commits for issues caught post-generation
- **Prompt history:** `ai-prompts/` (planning, design, implementation, testing, debugging, code-review, documentation)
- **Rollup:** `final-ai-usage-summary.md`

Notable catches: `isTerminal` dual source of truth, `updateFields` check order drift, empty-string FK bypass, LIKE search wildcard bug, misplaced `ui-flow.md` content.

---

## Screenshots / Demo Notes

**Run locally:**

```bash
# Terminal 1
cd backend && npm run dev          # http://localhost:3000

# Terminal 2
cd frontend && npm run dev         # http://localhost:5173
```

**Demo flow:**
1. Select acting user (e.g. James Chen) in header
2. Browse seeded tickets — search `login`, filter by `OPEN`
3. Open a ticket → transition OPEN → IN_PROGRESS → … using buttons from API
4. Add a comment on an active ticket
5. Open a `CLOSED` ticket — confirm read-only banner, no edit/comment controls

---

## Known Limitations (Core scope)

- No authentication or role-based access control
- No pagination, sorting, or priority/assignee filters
- No ticket/comment delete
- No automated persistence-restart or frontend E2E tests
- No reopening of terminal tickets
- SQLite file DB (not production-grade for high concurrency)

---

## Future Improvements (Stretch)

- Playwright E2E tests for UI flows
- Persistence integration test
- OpenAPI / Swagger documentation
- Priority and assignee filters, pagination
- CI workflow (unit + integration + frontend build)
- Docker Compose for one-command startup
