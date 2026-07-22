# Design Notes

Concise synthesis of architectural decisions for Core. Detail lives in companion docs — refer to those rather than treating this as the canonical spec.

| Doc | Scope |
|-----|-------|
| `data-model.md` | Prisma schema, enums, FKs, resolved field decisions |
| `api-contract.md` | REST endpoints, error shapes, per-endpoint check order |
| `ui-flow.md` | Screens, interactions, error surfacing |

---

## Note on repository structure

The assignment template specifies top-level `src/` and `tests/` folders. Since this is
a full-stack project with independent frontend and backend dependency trees, I split
these into `backend/` and `frontend/` at the root instead, each with its own `src/` and
`tests/` internally (e.g., `backend/src/`, `backend/tests/`, `frontend/src/`). This
preserves the intent of the required structure (source and tests clearly separated)
while keeping the two apps' dependencies and configs independent, which a single shared
src/ would not allow cleanly.

## Architecture Overview (frontend, backend, database)

Three-tier layout aligned with `implementation-plan.md`:

```
┌──────────────────────┐     ┌─────────────────────────────┐     ┌─────────────┐
│  React (Vite) UI     │────►│  Express REST API           │────►│  SQLite via │
│  ui-flow.md          │     │  api-contract.md            │     │  Prisma     │
└──────────────────────┘     │  Services + route handlers    │     │  data-model │
         │                   └─────────────────────────────┘     └─────────────┘
         │  X-Acting-User-Id on writes
         └─ allowedStatuses from API (no client state machine)
```

- **Frontend:** SPA with routes for list, create, and detail. Global acting-user context (`localStorage` + header dropdown). API client attaches `X-Acting-User-Id` on mutating calls.
- **Backend:** Thin route handlers → service layer → Prisma. Business rules (state machine, terminal guards, search) live in services, not controllers or the UI.
- **Database:** SQLite file for durable persistence across restarts. Prisma enums for `Priority` and `TicketStatus`; FKs for all user/ticket references. See `data-model.md`.

No authentication in Core — acting user is a demo attribution mechanism, not access control.

---

## Frontend Design

See `ui-flow.md` for screen-by-screen detail. Summary:

- **Three screens:** ticket list (`GET /tickets`), create form (`POST /tickets`), detail (`GET /tickets/:id` + mutations).
- **Acting user:** header dropdown populated by `GET /users`; selection persisted in `localStorage`; required before any write.
- **List:** debounced search + single-status filter; loading skeletons; distinct empty states (no tickets vs. no matches).
- **Detail:** view/edit toggle for non-terminal tickets; comment list (oldest first) + add form; status actions rendered **only** from `allowedStatuses` in API responses.
- **Terminal tickets (`CLOSED` / `CANCELLED`):** muted styling, read-only banner, no edit/transition/comment controls. Existing comments remain visible.

**Mirror, don't duplicate:** The UI never maintains a transition map. After every fetch or mutation that returns ticket `data`, transition buttons are derived from `data.allowedStatuses`. Invalid transitions should be unreachable in normal use; if the API returns `422`, refetch and resync.

---

## Backend Design

Layered structure mapping directly to `api-contract.md` check orders:

| Layer | Responsibility |
|-------|----------------|
| **Routes** | HTTP parsing, Zod/schema validation of request shape, attach `X-Acting-User-Id`, map service errors → HTTP status + `ErrorResponse` |
| **`ActingUserService`** | Resolve and validate acting user (shared by all mutating endpoints) |
| **`TicketStatusService`** | **Single source of truth** for the state machine: `canTransition`, `getAllowedTransitions`, `isTerminal`, enum parsing. No transition logic elsewhere. |
| **`TicketService`** | CRUD, field updates, list/search/filter, orchestrates status changes via `TicketStatusService` |
| **`CommentService`** | Comment create; delegates terminal check to `TicketStatusService` |
| **Prisma** | Persistence, FK enforcement, enum constraints |

### State machine — single source of truth

All transition rules live in **`TicketStatusService`**:

- Allowed map: `OPEN → {IN_PROGRESS, CANCELLED}`, `IN_PROGRESS → {RESOLVED, CANCELLED}`, `RESOLVED → {CLOSED}`, terminal → `{}`.
- `getAllowedTransitions(currentStatus)` powers `allowedStatuses` in API responses.
- `canTransition(from, to)` is the only gate for `PATCH /tickets/:id/status`.
- `isTerminal(status)` is shared by field-update, status-change, and comment paths.

Controllers and the React app **consume** this service's output; they do not re-implement rules. UI mirrors `allowedStatuses`; backend enforces on every write.

### Check order → service method structure

`api-contract.md` defines explicit evaluation sequences so overlapping failures return a deterministic status code. Service methods implement **early-return guards in the documented order**:

**`TicketService.updateFields(id, …)`** — maps to `PATCH /tickets/:id` check order:
1. `ActingUserService.validate(header)`
2. Request body / field syntax validation (route or `TicketValidator`)
3. `findTicket(id)` → `404`
4. `TicketStatusService.isTerminal(ticket.status)` → `422 TERMINAL_TICKET_READ_ONLY`
5. `assignedToId` FK check if non-null → `400`

**`TicketService.transitionStatus(id, status, expectedStatus)`** — maps to `PATCH /tickets/:id/status` check order:
1. `ActingUserService.validate(header)`
2. Body presence (`status`, `expectedStatus`)
3. `TicketStatusService.parseStatus(...)` for both fields → `400` **before** DB compare
4. `findTicket(id)` → `404`
5. `isTerminal(ticket.status)` → `422`
6. `ticket.status !== expectedStatus` → `409 STATUS_CONFLICT`
7. `status === ticket.status` → `400` (same-state)
8. `!canTransition(ticket.status, status)` → `422 INVALID_STATUS_TRANSITION`
9. Atomic Prisma update of `status` + `updatedAt`

**`CommentService.create(ticketId, message)`** — maps to `POST /tickets/:id/comments` check order:
1. `ActingUserService.validate(header)`
2. Message non-empty → `400`
3. `findTicket(id)` → `404`
4. `isTerminal(ticket.status)` → `422`

Shared helpers (`findTicket`, `isTerminal`) prevent drift between the three mutation paths.

---

## Database Design

See `data-model.md` for full Prisma schema. Key points:

- **Entities:** `User` (seeded), `Ticket`, `Comment` — CUID primary keys.
- **Enums:** `Priority` (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`), `TicketStatus` (`OPEN` | `IN_PROGRESS` | `RESOLVED` | `CLOSED` | `CANCELLED`). No free strings.
- **Resolved decisions:** no default priority (non-nullable, client-required); `assignedToId` nullable at all times including `IN_PROGRESS`.
- **FKs:** `createdById` and comment `createdById` → `Restrict`; `assignedToId` → `SetNull`; `Comment.ticketId` → `Cascade` (defensive; no delete in Core).
- **Indexes:** `Ticket.status`, `Ticket.priority`, `Comment.ticketId` for filter and detail loads.

State transitions are **not** DB triggers — application layer only (`TicketStatusService`).

---

## Validation Strategy

Two tiers, backend authoritative:

| Tier | Where | What |
|------|-------|------|
| **Client** | React forms | Immediate UX: required fields, whitespace trim, priority required on create, acting user selected. Blocks obvious bad submits. |
| **Server** | Routes + services | All acceptance-criteria rules: enums, FK existence, terminal guards, state machine, search param validity. **Wins on conflict.** |

- **Shape validation** (Zod at route): field types, required keys, enum strings, reject `status`/`createdById` in field-update body.
- **Domain validation** (services): terminal read-only, transition permission, optimistic concurrency, assignee FK.
- **`createdById`:** always set server-side from `X-Acting-User-Id`; never accepted from client body.
- **Search:** case-insensitive `title` + `description` only; escape `LIKE` wildcards; invalid `status` filter → `400`.

Open items (max field lengths, combined-update atomicity) deferred — apply constants in `TicketValidator` when resolved.

---

## Error Handling Strategy

### Taxonomy (`api-contract.md`)

All errors return `{ error: { code, message, details? } }`:

| HTTP | `error.code` | Layer / use |
|------|--------------|-------------|
| `400` | `VALIDATION_ERROR` | Shape, enums, empty fields, same-state transition, bad query param |
| `400` | `INVALID_ACTING_USER` | Missing/unknown `X-Acting-User-Id` |
| `404` | `NOT_FOUND` | Ticket not found |
| `409` | `STATUS_CONFLICT` | `expectedStatus` ≠ current (stale/concurrent) |
| `422` | `INVALID_STATUS_TRANSITION` | Disallowed transition |
| `422` | `TERMINAL_TICKET_READ_ONLY` | Mutation on `CLOSED` / `CANCELLED` |
| `500` | `INTERNAL_ERROR` | Catch-all; no stack trace in body |

Central **`errorMiddleware`** maps service-thrown `AppError` (code + status + details) to JSON. Routes do not construct ad-hoc error shapes.

### Frontend surfacing (`ui-flow.md`)

- `400` → field-level `details` on forms; acting-user prompt in header.
- `404` → “Ticket not found” + link to list.
- `409` → auto-refetch detail, prompt retry with fresh status.
- `422` → actionable banner; refetch to resync `allowedStatuses` / terminal state.
- `500` / network → generic retry message; preserve form input on failed mutations.

Check-order decisions ensure the UI sees **consistent** codes (e.g., terminal ticket always `422`, never `409`).

---

## Testing Strategy Link

Detailed test plan: **`test-strategy.md`**. Latest run output: **`test-results.md`**. Coverage targets from `acceptance-criteria.md`:

| Area | Focus |
|------|-------|
| **`TicketStatusService`** | All 5 valid transitions; all rejected classes; `getAllowedTransitions`; `isTerminal`; same-state rejection |
| **`TicketService`** | Create/update validation; terminal guards; search/filter (case, empty query, special chars); `409` concurrency |
| **`CommentService`** | Empty message; terminal ticket block |
| **Integration / API** | Check-order sequences return correct status codes when multiple conditions overlap |
| **Persistence** | Data survives restart |
| **UI** | Optional E2E for acting-user, list filters, terminal read-only presentation |

Unit tests anchor on `TicketStatusService` first — if it passes, route and UI mirroring stay aligned.
