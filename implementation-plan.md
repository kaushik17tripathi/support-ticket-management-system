# Implementation Plan

## Overview

Build the Core Support Ticket Management System as a full-stack app with a **Node.js/Express API**, **Prisma ORM** with **SQLite** (file-based persistence for restart survival), and a **React (Vite)** frontend. The backend is the source of truth for validation, referential integrity, and the status state machine; the frontend mirrors allowed transitions for UX but never relies on UI-only enforcement.

Scope is limited strictly to `requirements-analysis.md` and `acceptance-criteria.md`: ticket CRUD, five valid status transitions, comment creation on non-terminal tickets only, keyword search + single-status filter, acting-user dropdown (no auth), seeded users, terminal-ticket read-only behavior, structured errors, and automated tests for the highest-risk logic (state machine, validation, search/filter, persistence).

**Estimated total effort:** ~10.5 hours for Core (within the 8–12 hour assignment window).

**Delivery order:** database schema and backend services first, then API routes and backend tests, then frontend pages that consume the API, then UI polish/error states, then end-to-end verification against acceptance criteria.

---

## Task Breakdown (ordered, with rough hour estimates)

| # | Task | Est. |
|---|------|------|
| **Setup & data layer** | | |
| 1 | Bootstrap monorepo/workspace: Express API, React (Vite) app, shared scripts (`dev`, `test`, `db:migrate`, `db:seed`), `.env.example` | 0.5h |
| 2 | Prisma schema: `User`, `Ticket`, `Comment` models with enums (`Priority`, `Status`), FK relations, timestamps | 0.5h |
| 3 | Initial Prisma migration + SQLite database file under `database/` | 0.25h |
| 4 | User seed script (`database/seed-data/`): sample users with `id`, `name`, `email`, `role` | 0.25h |
| **Backend — domain logic** | | |
| 5 | Status state machine module: allowed transitions map, `canTransition(from, to)`, `getAllowedTransitions(from)`, terminal-status helper, unknown-status guard | 0.75h |
| 6 | Ticket service — create: validate required fields (`title`, `description`, `priority`), default `status = Open`, set `createdBy` from acting user, optional `assignedTo`, reject invalid priority/assignee | 0.5h |
| 7 | Ticket service — update: block all changes on Closed/Cancelled; validate priority/assignee; apply field updates; refresh `updatedAt` | 0.5h |
| 8 | Ticket service — status change: enforce state machine atomically; return clear error on invalid transition; support optimistic conflict detection (expected current status → 409 on mismatch) | 0.5h |
| 9 | Ticket service — list: case-insensitive keyword search on `title` + `description` only; single-status filter; empty search returns all (subject to filter); reject invalid filter status | 0.75h |
| 10 | Comment service — create: validate non-empty `message`, existing `ticketId`, reject if ticket is Closed/Cancelled; set `createdBy` from acting user | 0.5h |
| **Backend — API layer** | | |
| 11 | REST routes: `GET /users` (for acting-user dropdown), `GET/POST /tickets`, `GET/PATCH /tickets/:id`, `PATCH /tickets/:id/status`, `POST /tickets/:id/comments` | 0.75h |
| 12 | Request validation layer (e.g., Zod): field-level errors for create/update/comment; acting user passed via header or body field | 0.5h |
| 13 | Centralized error middleware: 400 validation, 404 not found, 409 conflict, 500 generic; structured JSON error bodies | 0.25h |
| **Backend — tests** | | |
| 14 | Unit tests: state machine (5 valid + all rejected transition classes, unknown status, same-state consistency) | 0.75h |
| 15 | Integration tests: ticket CRUD validation, terminal read-only guards, comment rules, search/filter (case-insensitive, combined, empty query, special chars) | 0.75h |
| 16 | Integration test: persistence across DB reconnect / app restart (seed users + tickets survive) | 0.25h |
| **Frontend — foundation** | | |
| 17 | API client module + React acting-user context (dropdown of seeded users, persisted in `localStorage` for demo convenience) | 0.5h |
| 18 | App routing/shell: list route, create route, detail route | 0.25h |
| **Frontend — features** | | |
| 19 | Ticket list page: table/cards with title, status, priority, assignee, created date; search input; single-status filter dropdown; loading + empty states | 1h |
| 20 | Create ticket page: form for title, description, priority (required — no default until clarified), optional assignee; submit with acting user | 0.5h |
| 21 | Ticket detail page — read view: all fields, comment history (oldest first), terminal visual distinction | 0.5h |
| 22 | Ticket detail page — edit mode: update title, description, priority, assignee (non-terminal only) | 0.5h |
| 23 | Ticket detail page — status transitions: show only allowed next statuses from backend/helper; success feedback on change | 0.5h |
| 24 | Ticket detail page — comments: list + add form on non-terminal tickets; hidden/disabled on Closed/Cancelled | 0.5h |
| **Frontend — error & polish** | | |
| 25 | Error handling UI: field-level validation messages, 404 page/message, 409 refresh prompt, network retry message, no stack traces on 500 | 0.5h |
| 26 | Manual QA pass against `acceptance-criteria.md` checklist; fix gaps | 0.5h |
| **Documentation** | | |
| 27 | Update `database/setup-notes.md` and `README.md`: run instructions, acting-user dropdown behavior, state machine summary | 0.25h |
| | **Total** | **~10.5h** |

---

## Milestones

### M1 — Data & domain foundation (~2h)
**Done when:** Prisma schema migrated, users seeded, state machine module exists with unit tests for valid/rejected transitions.

- Tasks 1–5, 14 (state machine tests only)

### M2 — Backend API complete (~4h cumulative)
**Done when:** All ticket and comment endpoints work via API client (Postman/curl); validation, terminal guards, search/filter, and structured errors behave per acceptance criteria; backend integration tests pass.

- Tasks 6–13, 14–16

### M3 — Frontend core flows (~8.5h cumulative)
**Done when:** User can select acting user, create/list/view/update tickets, transition status, add comments, and search/filter — all against the live API.

- Tasks 17–24

### M4 — Core delivery (~10.5h cumulative)
**Done when:** Error/empty/loading states polished, terminal tickets fully read-only in UI, manual QA checklist complete, setup docs written. Ready for demo and code review.

- Tasks 25–27

---

## AI Usage Plan (how I'll use AI at each stage)

### Planning
- Draft and refine `requirements-analysis.md`, `acceptance-criteria.md`, and this plan from the Core spec.
- Ask AI to challenge assumptions (e.g., terminal-ticket read-only scope, search fields) and flag contradictions before coding starts.
- Use AI to enumerate edge cases for the state machine and turn them into test cases.

### Scaffolding
- Generate initial Prisma schema, folder structure, Express route skeleton, and React page stubs from the data model and API contract.
- Prompt AI for seed data (realistic user names/roles) and npm scripts (`dev`, `test`, `db:migrate`, `db:seed`).
- Review all scaffold output manually — accept structure, reject unnecessary dependencies.

### Code generation
- Implement the **state machine module** and **ticket/comment services** with AI assistance, but keep transition rules in one authoritative file.
- Generate Zod schemas and API route handlers from acceptance-criteria validation items.
- Build React components (list, form, detail, comment section) incrementally; one feature per prompt to keep diffs reviewable.
- **Not** AI-generated wholesale: error middleware patterns, optimistic locking for 409, and search query escaping — verify these carefully.

### Testing
- Ask AI to generate test matrices for all valid and rejected transitions, then implement with Jest/Vitest + Supertest.
- Use AI to draft search/filter test cases (case-insensitivity, empty query, special characters, invalid status filter).
- Run tests after each milestone; paste failures back to AI for targeted fixes rather than full rewrites.

### Debugging
- When a transition is wrongly allowed or search returns wrong results, paste the service code + failing test + expected behavior into AI for root-cause analysis.
- Use AI to interpret Prisma migration errors and FK constraint failures.
- For UI/backend drift (e.g., UI shows a transition the API rejects), compare allowed-transitions helper on both sides with AI.

### Review
- Before marking Core done, ask AI to review the diff against `acceptance-criteria.md` and flag missing items.
- Use AI for a focused security pass (SQL injection via search, oversized payloads, error message leakage).
- Document accepted/rejected AI suggestions in `code-review-notes.md` and `ai-prompts/`.

---

## Risks

| Risk | Impact |
|------|--------|
| **State machine bugs** — invalid transition allowed or valid transition blocked | High — core business rule violation |
| **UI/backend drift** — frontend shows transitions the API rejects (or hides valid ones) | Medium — poor UX, eroded trust in validation |
| **Open clarifications unresolved** — default priority, max field lengths, same-state transition behavior, atomic combined updates | Medium — rework or inconsistent behavior |
| **Terminal-ticket leaks** — field edit, status change, or comment allowed on Closed/Cancelled via API or stale UI | High — violates read-only requirement |
| **Concurrent status updates** — two transitions race; second write silently overwrites | Medium — data integrity / wrong status |
| **Search injection or special-character breakage** — unescaped `%`, `_`, quotes in SQLite `LIKE` | Medium — errors or unexpected matches |
| **Persistence failures** — in-memory store used by mistake, or seed script wipes data on restart | High — fails Core persistence criteria |
| **Scope creep** — pagination, sorting, auth, reopening tickets, role-based access | Medium — blows 8–12h budget |
| **Over-reliance on AI** — generated code with subtle logic errors in state machine or validation | Medium — bugs caught late |
| **Acting-user bypass** — client can spoof `createdBy` if not enforced server-side | Low–Medium — incorrect attribution |

---

## Mitigation

| Risk | Mitigation |
|------|------------|
| State machine bugs | Single `statusStateMachine.ts` module; table-driven tests for all 5 valid + 9 rejected transition classes before building UI |
| UI/backend drift | Expose `GET /tickets/:id/allowed-transitions` or share transition map; UI renders only allowed options; never duplicate rules inconsistently |
| Open clarifications | Decide defaults at start of M2: require explicit priority (no default), reject same-state transitions with 400, fail whole request on invalid status+field combo, allow clearing `assignedTo` on non-terminal tickets; document in `design-notes.md` |
| Terminal-ticket leaks | Guard at service layer (not just controller); integration tests for field update, status change, and comment on Closed/Cancelled; UI hides controls based on terminal status |
| Concurrent updates | Include `expectedStatus` (or ETag) on status PATCH; return 409 when current status differs; frontend prompts refresh |
| Search injection | Use Prisma parameterized queries; escape `LIKE` wildcards in user input; test with `%`, `_`, and quotes |
| Persistence failures | Use SQLite file DB committed to `.gitignore` but documented in setup notes; integration test creates ticket, restarts DB connection, asserts data exists; seed uses upsert, never destructive reset in dev |
| Scope creep | Check every task against acceptance criteria; defer pagination, sorting, auth, delete, reopen to post-Core |
| Over-reliance on AI | Small PR-sized prompts; always read diffs; require passing tests before moving to next task |
| Acting-user bypass | Accept acting user ID in request header/body but validate it exists in DB; set `createdBy` server-side only |
