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