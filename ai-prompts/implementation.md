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