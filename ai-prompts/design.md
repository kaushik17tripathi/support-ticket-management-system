# Design Prompts

## Prompt 1 — Data model / Prisma schema
**Prompt:** Based on requirements-analysis.md and acceptance-criteria.md, write data-model.md with:

1. An ERD description (entities, fields, relationships, in plain text/table form)
2. The actual Prisma schema code for User, Ticket, Comment
3. A short "Design Decisions" section explaining: why status and priority are enums
   (not free strings), how referential integrity is enforced at the DB level (FKs on
   assignedTo, createdBy, ticketId), and the cascade behavior when a ticket is referenced
   by comments

Also formally resolve these two previously-open items and note them as resolved here:
- Default priority on create: no default — priority is a required field, client must
  select one explicitly
- assignedTo can be cleared to null while a ticket is In Progress (assignedTo is
  optional at all times per Assumption #6)
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

## Prompt 1 — UI flow
**Prompt:** Based on api-contract.md, data-model.md, and requirements-analysis.md, write ui-flow.md
describing the frontend screens and flow:

1. Acting-user selection (dropdown, persisted for session)
2. Ticket list screen: search input, single-status filter, list display, loading/empty
   states, navigation to detail
3. Create ticket screen/form: fields, validation feedback, success/failure handling
4. Ticket detail screen: field display, edit mode, status transition controls (driven
   by allowedStatuses from the API), comment list, comment form
5. Terminal ticket presentation: how CLOSED/CANCELLED tickets look different (read-only
   indicators, disabled controls, hidden comment form)
6. Error state handling: how 400/404/409/422/500 responses from api-contract.md surface
   to the user in each screen

For each screen, describe layout intent (not exact CSS), key interactions, and which
API endpoint(s) it calls. Note where the UI mirrors backend allowedStatuses rather than
re-implementing state machine logic client-side.
**AI Response Summary:** Generated full screen-by-screen flow (acting-user selector,
ticket list, create form, ticket detail with edit/status/comments, terminal-ticket
presentation, error-state mapping) consuming api-contract.md endpoints. Explicitly
enforced "UI mirrors allowedStatuses, never re-implements state machine" as a
recurring principle across every relevant section, and mapped every error code from
api-contract.md to screen-specific behavior including the full 409 conflict-resolution
flow (send expectedStatus → refetch on conflict → resync → retry).

**Accepted:** Full document as generated — directly closes the "UI/backend drift" risk
flagged in implementation-plan.md by design, not by later correction.

**Changed:** N/A

**Rejected:** N/A