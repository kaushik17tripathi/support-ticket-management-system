# Implementation Prompts

## Prompt 1 — Backend runnable skeleton

**Prompt:**

This backend has prisma/schema.prisma already finalized and dependencies
installed (express, @prisma/client, zod, vitest, supertest, ts-node-dev, typescript).
Set up the runnable skeleton:
- Add/update npm scripts in package.json: "db:migrate" (prisma migrate dev),
  "db:generate" (prisma generate), "db:seed" (ts-node prisma/seed.ts),
  "dev" (ts-node-dev src/index.ts), "test" (vitest run)
- Create src/lib/prisma.ts exporting a PrismaClient singleton
- Create src/index.ts: minimal Express app on port 3000 with a GET /health endpoint
  returning { status: "ok" }
- Make sure .env has DATABASE_URL="file:./dev.db"
Don't build any routes, services, or seed data yet — just confirm the app boots and
can reach the database.

**AI Response Summary:** Added npm scripts, created src/lib/prisma.ts with a
PrismaClient singleton, created src/index.ts with Express app + /health endpoint,
confirmed .env DATABASE_URL. Ran npm install, prisma generate, and prisma migrate dev
--name init to create the initial migration and dev.db.

**Accepted:** Full skeleton as generated. Verified /health returns {"status":"ok"}
in browser, confirmed migration created dev.db.

**Changed:** AI added `dotenv` as a dependency, not explicitly requested — reasonable
addition since Express doesn't auto-load .env files and PrismaClient needs
DATABASE_URL available at runtime.

**Rejected:** N/A

---

## Prompt 2 — TicketStatusService state machine (initial generation)

**Prompt:**

Create backend/src/services/ticketStatusService.ts implementing the state machine
from design-notes.md and api-contract.md:

Allowed transitions:
OPEN -> IN_PROGRESS, CANCELLED
IN_PROGRESS -> RESOLVED, CANCELLED
RESOLVED -> CLOSED
CLOSED -> (none, terminal)
CANCELLED -> (none, terminal)

Implement:
- canTransition(from: TicketStatus, to: TicketStatus): boolean
- getAllowedTransitions(from: TicketStatus): TicketStatus[]
- isTerminal(status: TicketStatus): boolean

Use an explicit adjacency map (Record<TicketStatus, TicketStatus[]>), not range or
comparison-based logic, so every transition is individually enumerated and testable.
Import TicketStatus from the generated Prisma client. Add JSDoc comments referencing
the source of truth (design-notes.md).

**AI Response Summary:** Generated canTransition, getAllowedTransitions, and isTerminal
using an explicit Record<TicketStatus, TicketStatus[]> adjacency map for transitions,
but isTerminal used a separately-hardcoded TERMINAL_STATUSES Set instead of deriving
from the map.

**Accepted:** canTransition and getAllowedTransitions implementation — correctly uses
explicit adjacency map, correctly rejects same-state transitions, correctly returns []
(not undefined/throw) for terminal statuses.

**Changed:** N/A at this point — issue identified during review, corrected in Prompt 3.

**Rejected:** N/A

**Note:** Reviewed line-by-line against four specific checks (explicit map vs.
comparison logic, same-state rejection, empty-array terminal returns, isTerminal
consistency with the map) before accepting. Found isTerminal used a second,
independently-hardcoded source of truth — see Prompt 3 for the fix.

---

## Prompt 3 — Fix isTerminal() dual source of truth

**Prompt:**

isTerminal() uses a separately-hardcoded TERMINAL_STATUSES Set instead of deriving
terminality from ALLOWED_TRANSITIONS itself. This creates two sources of truth that
could drift out of sync if a status's transitions change without updating the set.

Rewrite isTerminal() to derive its answer directly from ALLOWED_TRANSITIONS — a status
is terminal if and only if its entry in the map is an empty array. Remove the separate
TERMINAL_STATUSES Set entirely.

**AI Response Summary:** Rewrote isTerminal() to check
`ALLOWED_TRANSITIONS[status].length === 0` directly, removed the standalone
TERMINAL_STATUSES Set entirely.

**Accepted:** The corrected isTerminal implementation.

**Changed:** Rejected the standalone TERMINAL_STATUSES Set; had AI rewrite isTerminal
to derive terminality directly from ALLOWED_TRANSITIONS (empty array = terminal),
eliminating a second, driftable source of truth within the same file.

**Rejected:** N/A

**Note:** Caught AI mistake — internal inconsistency in the "single source of truth"
principle. The module correctly avoided drift relative to the rest of the app (routes/UI
consume it, not their own copies) but had latent drift risk *within itself* between two
representations of the same fact. This is subtler than a typical bug and worth flagging
as a maintainability catch, not just a correctness catch.

## Prompt 4 — Unit tests for TicketStatusService
**Prompt:** Create backend/tests/ticketStatusService.test.ts using Vitest, testing every function
in src/services/ticketStatusService.ts exhaustively:

canTransition — one test per valid transition (5 total) asserting true, AND one test
per rejected transition class from api-contract.md asserting false:
- Skip-ahead: OPEN->RESOLVED, OPEN->CLOSED, IN_PROGRESS->CLOSED
- Backward/reopen: IN_PROGRESS->OPEN, RESOLVED->OPEN, RESOLVED->IN_PROGRESS
- Late cancel: RESOLVED->CANCELLED
- Terminal outbound: CLOSED->OPEN, CLOSED->IN_PROGRESS, CLOSED->RESOLVED, CLOSED->CANCELLED,
  CANCELLED->OPEN, CANCELLED->IN_PROGRESS, CANCELLED->RESOLVED, CANCELLED->CLOSED
- Same-state: OPEN->OPEN, IN_PROGRESS->IN_PROGRESS, RESOLVED->RESOLVED,
  CLOSED->CLOSED, CANCELLED->CANCELLED

getAllowedTransitions — one test per status asserting the exact expected array
(order-independent comparison), including empty arrays for CLOSED and CANCELLED.

isTerminal — one test per status: true for CLOSED/CANCELLED, false for the other three.

Use descriptive test names (e.g., "rejects OPEN -> RESOLVED (skip-ahead)") so failures
are immediately diagnosable. Do not use loops/table-driven generation that would hide
which specific case failed — each transition gets its own explicit test() call.

**AI Response Summary:** Generated 35 explicit, individually-named tests across
canTransition (25: 5 valid + 20 rejected across all 5 rejection classes),
getAllowedTransitions (5), and isTerminal (5). Used a toHaveLength + arrayContaining
helper for order-independent, exact-set array comparison.

**Accepted:** Full test file — verified test count against acceptance-criteria.md's
explicit transition list (all 5 valid, all rejected classes present, no gaps or
duplicates), confirmed no table-driven loops, ran npm test independently rather than
trusting Cursor's own "all passing" summary.

**Changed:** N/A

**Rejected:** N/A

## Prompt 5 — TicketService (initial generation)
**Prompt:** Create backend/src/services/ticketService.ts implementing ticket CRUD and status
transitions per design-notes.md's Backend Design section and api-contract.md's check
orders. Use Prisma client from src/lib/prisma.ts and the state machine helpers from
src/services/ticketStatusService.ts — do not reimplement transition logic here.

Implement these methods, each following its documented check order exactly (return/throw
on first failure, in sequence):

1. create(data: { title, description, priority, assignedToId?, createdById }) 
   - validate title/description non-empty after trim, priority is valid enum,
     assignedToId (if provided) references existing user
   - status always set to OPEN server-side

2. list(params: { search?: string, status?: TicketStatus }) 
   - case-insensitive search on title + description only
   - empty/omitted search returns all (subject to status filter)
   - invalid status value should be caught by the route layer (Zod), not here

3. getById(id: string) — include comments ordered oldest-first, and computed
   allowedStatuses via getAllowedTransitions

4. updateFields(id: string, data: { title?, description?, priority?, assignedToId? }) 
   - check order: ticket exists (404) -> is terminal (422) -> field validation (400)
   - at least one field required
   - assignedToId can be explicitly set to null

5. transitionStatus(id: string, status: TicketStatus, expectedStatus: TicketStatus) 
   - check order: ticket exists (404) -> is terminal (422) -> expectedStatus matches
     current (409) -> same-state check (400) -> canTransition (422) -> atomic update

Throw typed errors (create a shared AppError class with code/status/details) rather than
returning ad-hoc objects, so the route layer can map them consistently to api-contract.md's
error taxonomy.

**AI Response Summary:** Generated create, list, getById, updateFields, and
transitionStatus, all throwing typed AppError instances. transitionStatus uses an
atomic conditional update (updateMany with where: {id, status: expectedStatus}) as a
second layer of concurrency protection beyond the initial read-check. updateFields
implemented check order as literally specified in my prompt: exists -> terminal ->
field validation.

**Accepted:** transitionStatus check order and atomic-update race protection;
assignedToId null-vs-undefined handling in both create and updateFields (correctly
distinguishes "not provided" from "explicitly cleared" using !== undefined checks,
not truthiness).

**Changed:** Caught that updateFields' check order (exists -> terminal -> field
validation) contradicts the already-committed api-contract.md order (field validation
-> exists -> terminal). Traced this to my own Step 9a prompt specifying the wrong
order, not an independent AI error. Corrected via follow-up prompt to reorder
validateUpdateFieldsInput() before findTicketOrThrow().

**Rejected:** N/A

**Note:** Caught a cross-document inconsistency, not just a code bug — the
implementation was internally consistent with what I asked for, but what I asked for
had drifted from an earlier, already-reviewed design decision. This is a good example
of why re-checking new code against prior committed artifacts matters, not just
against the current prompt's own instructions. Also flagged escapeLikePattern's
backslash-escaping as unverified — will confirm with a dedicated special-character
search test in Step 10 rather than trusting the code comment.

## Prompt 6 — CommentService (initial generation)
**Prompt:** Create backend/src/services/commentService.ts using the same patterns as
ticketService.ts (AppError, prisma singleton, isTerminal from ticketStatusService).

Implement:
create(ticketId: string, message: string, createdById: string): Promise<CommentDto>

Check order (api-contract.md):
1. message present and non-empty after trim? -> 400 VALIDATION_ERROR
2. ticket exists? -> 404 NOT_FOUND
3. ticket is terminal (CLOSED/CANCELLED)? -> 422 TERMINAL_TICKET_READ_ONLY

Note: createdById existence is validated by the route layer via ActingUserService,
not re-validated here, to avoid duplicating that check — confirm this matches how
ticketService.ts's create() handles createdById, and be consistent.

**AI Response Summary:** Implemented create() with correct check order (message ->
exists -> terminal), but did NOT validate createdById — instead documented an
assumption that a route-layer ActingUserService would handle it. No such service
exists anywhere in the codebase.

**Accepted:** Check order and core comment-creation logic.

**Changed:** Rejected the ActingUserService assumption entirely — no such service
exists, and ticketService.create() already validates createdById inline, not via any
route-layer dependency. Had AI extract assertUserExists into a shared
userValidation.ts module, used by both ticketService and commentService consistently.

**Rejected:** The docstring's claim about route-layer validation — factually incorrect
given the current codebase state.

**Note:** Caught a real gap, not just a style nit — without this fix, an invalid
createdById on comment creation would bypass all application-level validation and
surface a raw Prisma FK constraint error to the API consumer, violating the error
taxonomy in api-contract.md. Traced by explicitly asking Cursor to reconcile behavior
between two services rather than reviewing each file in isolation — cross-file
consistency checks catch things single-file review misses.

## Prompt 7 — Routes + Zod validation layer (initial generation)
**Prompt:** Create the Express route layer for the Support Ticket Management System backend,
wiring up ticketService.ts and commentService.ts per api-contract.md exactly.

1. backend/src/middleware/actingUser.ts — middleware that reads X-Acting-User-Id
   header, validates it exists and references a real user (reuse userValidation.ts),
   attaches req.actingUserId, and throws AppError("INVALID_ACTING_USER", 400, ...) if
   missing or invalid. Apply only to mutating routes.

2. backend/src/middleware/errorHandler.ts — centralized Express error middleware that
   catches AppError instances and formats them as { error: { code, message, details } }
   with the correct status code. Catches unknown errors as 500 INTERNAL_ERROR without
   leaking stack traces in the response body (still log them server-side).

3. backend/src/validation/ticketValidation.ts — Zod schemas for:
   - createTicketSchema (title, description, priority required; assignedToId optional
     nullable string)
   - updateTicketSchema (all fields optional but at least one required — refine this)
   - transitionStatusSchema (status, expectedStatus both required valid TicketStatus enums)
   - listTicketsQuerySchema (search optional string, status optional valid TicketStatus enum)
   - createCommentSchema (message required non-empty string)

4. backend/src/routes/users.ts — GET /users (list all users, no auth needed)

5. backend/src/routes/tickets.ts — wire up:
   GET /tickets (list, query validated by listTicketsQuerySchema)
   POST /tickets (create, body validated by createTicketSchema, actingUser middleware)
   GET /tickets/:id (detail)
   PATCH /tickets/:id (update fields, body validated by updateTicketSchema, actingUser middleware)
   PATCH /tickets/:id/status (transition, body validated by transitionStatusSchema, actingUser middleware)
   POST /tickets/:id/comments (create comment, body validated by createCommentSchema, actingUser middleware)

6. Wire everything into src/index.ts: mount routers under /api, apply errorHandler as
   the last middleware.

Route handlers should be thin — parse/validate, call the service, return the response
shape from api-contract.md. Business logic stays in the services.
**AI Response Summary:** Generated actingUser middleware, errorHandler, validateBody/
validateQuery Zod middleware, ticketValidation.ts schemas, users.ts and tickets.ts
routers, and wired everything into index.ts. Check-order sequencing at the route level
correctly matched api-contract.md across all 4 mutating endpoints.

**Accepted:** Middleware structure, error handling, check-order sequencing at the
route level, response shape wrapping.

**Changed:** Found that assignedToId="" bypasses application-level validation via a
truthy check in ticketService (if (validated.assignedToId)) combined with the Zod
schema not rejecting empty strings, and ?? not catching falsy-but-defined values —
resulting in a raw Prisma FK error surfacing as an uncontrolled 500 instead of a clean
400. Fixed via explicit null/undefined checks and a Zod refine rejecting empty strings.

**Rejected:** N/A

**Note:** Traced this by mentally executing the empty-string case through Zod parsing
-> service truthy check -> ?? operator -> Prisma call, rather than just reading each
file in isolation. This is the kind of gap that unit tests on individual functions
wouldn't catch (assignedToId="" is a valid string, so type-level checks pass) but an
integration test sending a real empty-string payload would expose immediately —
motivates writing that exact test case in Step 12.

## Prompt 9 — Integration test infrastructure
**Prompt:** Set up integration test infrastructure for backend/tests/:

1. Add a "test:integration" script to package.json: cross-env DATABASE_URL="file:./prisma/test.db"
   vitest run tests/integration (install cross-env as a dev dependency for
   cross-platform env var support)
2. Create backend/tests/integration/setup.ts: a Vitest global setup that runs
   `prisma migrate reset --force --skip-seed` against the test DB before the suite,
   and seeds exactly 2 test users directly via Prisma (not the real seed.ts) so tests
   have known, stable user IDs to reference.
3. Create backend/tests/integration/testApp.ts: exports a configured Express app
   (reusing the same route/middleware setup as src/index.ts, but without app.listen())
   for Supertest to use directly.
4. Add "database/seed-data/" note: test DB is separate from dev DB and is NOT part of
   the seed data used for manual running/demoing the app.

**AI Response Summary:** Created setup.ts (wipes test.db, runs migrate deploy, seeds
2 fixed test users), testApp.ts (exports createApp() from new src/app.ts, extracted
from index.ts), testUsers.ts (stable IDs), vitest.integration.config.ts (fileParallelism:
false, globalSetup). Added @prisma/adapter-better-sqlite3 + better-sqlite3 as
dependencies, unprompted.

**Accepted:** Full infrastructure as generated, after verification.

**Changed:** N/A

**Rejected:** N/A

**Note:** Explicitly questioned the two new dependencies rather than accepting them
silently. Cursor's justification (Prisma 7 removed the built-in Rust query engine;
SQLite now requires a driver adapter) was verified against actual code in
lib/prisma.ts — the adapter is genuinely wired into every PrismaClient construction,
not decorative. Confirmed via git history that this affects the whole backend, not
just test infra, and predates/postdates [fill in once checked] the earlier dev-server
verification steps.

## Prompt 10 — Integration test suite
**Prompt:** Create backend/tests/integration/tickets.test.ts using Supertest against testApp.ts.
Use the 2 seeded test users' IDs from setup.ts. Cover, as real HTTP requests:

STATE MACHINE (via API, not re-testing ticketStatusService directly):
- Full happy path: create ticket -> OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED, asserting
  status and allowedStatuses at each step
- One rejected transition (e.g. OPEN -> RESOLVED) returns 422 INVALID_STATUS_TRANSITION
- A CLOSED ticket rejects a status change with 422 TERMINAL_TICKET_READ_ONLY, NOT 409,
  even when expectedStatus is stale (proves check-order precedence from api-contract.md)
- Stale expectedStatus on a non-terminal ticket returns 409 STATUS_CONFLICT

VALIDATION:
- Create ticket missing title -> 400 VALIDATION_ERROR with field-level details
- Create ticket with assignedToId: "" (empty string) -> 400 VALIDATION_ERROR
  (regression test for the empty-string bug we fixed)
- Create ticket with invalid priority -> 400
- Missing X-Acting-User-Id header on a mutating request -> 400 INVALID_ACTING_USER

TERMINAL READ-ONLY:
- PATCH fields on a CLOSED ticket -> 422 TERMINAL_TICKET_READ_ONLY
- POST comment on a CANCELLED ticket -> 422 TERMINAL_TICKET_READ_ONLY

COMMENTS:
- Add comment to non-terminal ticket -> 201, appears in GET ticket detail comments array
- Empty message -> 400

SEARCH / FILTER:
- Case-insensitive search matches (e.g. search "login" matches title "Login Issue")
- Search with special characters (%, _, backslash) in the query does NOT throw a
  server error and returns correct (possibly empty) results — this is the LIKE-escaping
  verification, create a ticket with a literal "%" in the title first and confirm
  searching for that literal "%" matches it, not a wildcard-expanded set
- status filter combined with search
- Empty search query returns all tickets (subject to status filter)

Use descriptive test names. Reset only the data needed between tests (or accept full
reset per test file if simpler) — don't let test order dependencies creep in.

**AI Response Summary:** Generated 16 integration tests across state machine (4),
validation (4), terminal read-only (2), comments (2), search/filter (4), covering
every check-order precedence case and a rigorous LIKE-escaping test using decoy
tickets to prove literal-character matching, not just absence of errors.

**Accepted:** Full test suite as generated. Specifically verified the two highest-risk
tests line-by-line: the terminal-vs-conflict precedence test asserts both the correct
AND explicitly-not-the-wrong error code; the LIKE-escaping test creates decoy tickets
that would incorrectly match under wildcard interpretation, proving true literal
escaping rather than just absence of a server error.

**Changed:** N/A

**Rejected:** N/A

**Note:** Ran both npm test (unit) and npm run test:integration for real, pasted actual
terminal output for both rather than accepting Cursor's own "Verify" narration —
consistent with the verification discipline established in Step 8.

---

## Prompt 12 — Dev database seed data

**Prompt:**

Let's continue with seed data for the dev database first (item 1 above).

Several users with varied roles, ~8-10 sample tickets across different statuses/priorities,
a few comments. Separate from test-only seeding in tests/integration/setup.ts.

**AI Response Summary:** Created `database/seed-data/devSeedData.ts` with 5 users (agent,
admin, manager, engineer roles), 10 tickets covering all five statuses and four priorities,
and 6 comments on non-terminal tickets. Implemented idempotent upserts in
`backend/prisma/seed.ts` using stable IDs and the Prisma 7 better-sqlite3 adapter.
Updated `database/seed-data/README.md` with contents table and run instructions.

**Accepted:** Seed data structure, upsert strategy, separation from integration test users,
realistic demo titles (including "Login Issue" for search), comments only on non-terminal
tickets per terminal read-only rules.

**Changed:** N/A

**Rejected:** N/A

**Note:** Verified on clean DB: `prisma migrate deploy` then `npm run db:seed` twice —
counts remain 5/10/6 (idempotent). Integration tests unaffected (separate test.db).