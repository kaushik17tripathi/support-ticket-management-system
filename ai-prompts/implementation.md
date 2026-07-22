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