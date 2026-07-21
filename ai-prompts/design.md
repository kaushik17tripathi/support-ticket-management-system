# Design Prompts

## Prompt 1 — Data model / Prisma schema
**Prompt:** [paste the full prompt from Step 5a]
**AI Response Summary:** Generated ERD tables, relationship cardinality, Prisma schema
with User/Ticket/Comment enums (Priority, TicketStatus), FK onDelete strategies
(Restrict/SetNull/Cascade), indexes on status/priority/ticketId, and a Design Decisions
section justifying enum usage, referential integrity choices, and cascade behavior.
Also formally resolved the two open items carried over from implementation-plan.md
(no default priority, assignedTo nullable while In Progress).

**Accepted:** Full schema, ERD, and design decisions as generated — status/priority
correctly modeled as Prisma enums (verified this specifically, since a prior prompt
in this project once produced status as a plain string).

**Changed:** N/A

**Rejected:** N/A

**Note:** Verified enum usage explicitly given earlier experience in this project with
AI defaulting to plain strings for status. This time it was correct on the first pass —
recorded here as evidence of validation, not just acceptance.


## Prompt 2 — Resolve check-order ambiguity in status transition endpoint
**Prompt:** [paste the check-order correction prompt from before]
**AI Response Summary:** Added explicit "Check Order" subsections to PATCH /tickets/:id,
PATCH /tickets/:id/status, and POST /tickets/:id/comments, each listing numbered
first-failure-wins validation sequences tailored to that endpoint. For the status
endpoint specifically: enum validation before concurrency check, and terminal-ticket
check before concurrency check (so a CLOSED ticket with a stale expectedStatus returns
422 TERMINAL_TICKET_READ_ONLY, not 409 STATUS_CONFLICT).

**Accepted:** All three check-order sequences as generated — reasoning was sound and
matched my own intent for terminal-check-before-concurrency precedence.

**Changed:** N/A

**Rejected:** N/A

**Note:** This closes a real design gap — the first-pass api-contract.md listed all
possible error codes for the status endpoint but never specified precedence when
multiple conditions applied simultaneously (e.g., a CLOSED ticket + stale
expectedStatus). Without this, the eventual state-machine service implementation and
its integration tests would have been ambiguous on which error to expect.