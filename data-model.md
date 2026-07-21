# Data Model

## Resolved Design Decisions

The following items were previously open in `requirements-analysis.md` and are **resolved** here:

| Item | Resolution |
|------|------------|
| **Default priority on create** | **No default.** `priority` is a required field on create; the client must select one of `Low`, `Medium`, `High`, or `Critical` explicitly. The database column is non-nullable with no default value. |
| **Clearing `assignedTo` while In Progress** | **Allowed.** `assignedTo` is optional at all times (Assumption #6). A non-terminal ticket — including one in `In Progress` — may have `assignedTo` set to `null`. The FK column is nullable and `onDelete: SetNull` applies when a referenced user is removed. |

---

## ERD Description

### Entities

#### User

Seeded only; no CRUD UI. Referenced as creator or assignee on tickets and as author on comments.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | String (CUID) | Yes | Primary key |
| `name` | String | Yes | Display name |
| `email` | String | Yes | Unique |
| `role` | String | Yes | Metadata only in Core; does not gate actions |

#### Ticket

Central entity. Status follows the application state machine (enforced in service layer, not DB triggers).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | String (CUID) | Yes | Primary key |
| `title` | String | Yes | Duplicate titles allowed |
| `description` | String | Yes | |
| `priority` | `Priority` enum | Yes | No default; client must select on create |
| `status` | `TicketStatus` enum | Yes | Defaults to `OPEN` on create |
| `assignedToId` | String (FK → User) | No | Nullable; may be cleared at any non-terminal status |
| `createdById` | String (FK → User) | Yes | Set from acting user on create |
| `createdAt` | DateTime | Yes | Auto-set |
| `updatedAt` | DateTime | Yes | Auto-updated on change |

#### Comment

Child of Ticket. Blocked by application logic on terminal tickets (`CLOSED`, `CANCELLED`); not enforced by a DB constraint.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | String (CUID) | Yes | Primary key |
| `ticketId` | String (FK → Ticket) | Yes | Parent ticket |
| `message` | String | Yes | |
| `createdById` | String (FK → User) | Yes | Set from acting user on create |
| `createdAt` | DateTime | Yes | Auto-set |

### Relationships

```
User 1 ──────────< * Ticket        (createdBy)   every ticket has one creator
User 0..1 ───────< * Ticket        (assignedTo)  optional assignee per ticket
User 1 ──────────< * Comment       (createdBy)   every comment has one author
Ticket 1 ─────────< * Comment      (ticketId)    every comment belongs to one ticket
```

| From | To | Cardinality | FK field | Optional? |
|------|----|-------------|----------|-------------|
| `Ticket` | `User` | many → one | `createdById` | No |
| `Ticket` | `User` | many → one | `assignedToId` | Yes |
| `Comment` | `Ticket` | many → one | `ticketId` | No |
| `Comment` | `User` | many → one | `createdById` | No |

### Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `Ticket` | `status` | Single-status filter |
| `Ticket` | `priority` | Future filtering/reporting |
| `Comment` | `ticketId` | Load comment history per ticket |

---

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
  CANCELLED
}

model User {
  id              String    @id @default(cuid())
  name            String
  email           String    @unique
  role            String
  createdTickets  Ticket[]  @relation("TicketCreator")
  assignedTickets Ticket[]  @relation("TicketAssignee")
  comments        Comment[]
}

model Ticket {
  id           String       @id @default(cuid())
  title        String
  description  String
  priority     Priority
  status       TicketStatus @default(OPEN)
  assignedToId String?
  assignedTo   User?        @relation("TicketAssignee", fields: [assignedToId], references: [id], onDelete: SetNull)
  createdById  String
  createdBy    User         @relation("TicketCreator", fields: [createdById], references: [id], onDelete: Restrict)
  comments     Comment[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@index([status])
  @@index([priority])
}

model Comment {
  id          String   @id @default(cuid())
  ticketId    String
  ticket      Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  message     String
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id], onDelete: Restrict)
  createdAt   DateTime @default(now())

  @@index([ticketId])
}
```

**API mapping note:** Prisma enum values use `SCREAMING_SNAKE_CASE` (e.g., `IN_PROGRESS`). The API/UI should map to display strings (`In Progress`) at the boundary; invalid values are rejected before persistence.

---

## Design Decisions

### Why `status` and `priority` are enums (not free strings)

Both fields draw from a **fixed, known set of values** defined in the Core spec:

- **Priority:** `Low`, `Medium`, `High`, `Critical`
- **Status:** `Open`, `In Progress`, `Resolved`, `Closed`, `Cancelled`

Using Prisma enums (backed by SQLite `TEXT` check constraints) gives:

1. **Database-level rejection** of invalid values — a ticket cannot be stored with `priority = "Urgent"` or `status = "Pending"`.
2. **Type safety** in application code via generated Prisma types.
3. **A stable contract** for search/filter (status filter matches enum values exactly).
4. **Alignment with the state machine** — transitions are defined over known statuses; free strings would require runtime parsing and invite typos.

State transition rules themselves are **not** encoded as DB constraints; they live in the authoritative backend state-machine service, since transition validity depends on the current status, not just the target value.

### Referential integrity at the DB level

Foreign keys enforce that references point to real rows:

| FK column | References | `onDelete` | Rationale |
|-----------|------------|------------|-----------|
| `Ticket.createdById` | `User.id` | `Restrict` | A ticket must always have a valid creator; deleting a referenced user would orphan audit data. |
| `Ticket.assignedToId` | `User.id` | `SetNull` | Assignee is optional; if a user were removed, the ticket remains with `assignedToId = null`. |
| `Comment.ticketId` | `Ticket.id` | `Cascade` | See below. |
| `Comment.createdById` | `User.id` | `Restrict` | A comment must always have a valid author. |

Invalid `assignedTo` or `createdBy` IDs submitted by the client are rejected by the FK constraint (surfaced as a referential-integrity error) and by application-level validation before insert/update.

`createdBy` on tickets and comments is set **server-side** from the acting user; the client cannot point these FKs at arbitrary users without going through validated API logic.

### Cascade behavior: comments referencing tickets

`Comment.ticketId` uses **`onDelete: Cascade`**: if a parent `Ticket` row were deleted, all of its `Comment` rows would be deleted automatically.

**Core context:** There is **no delete endpoint** for tickets or comments in Core (Assumption #11). Cascade is therefore **defensive schema design** for data consistency — comments are wholly owned by a ticket and have no meaning without it. If delete were added post-Core, cascade prevents orphaned comments.

Alternative considered: `onDelete: Restrict` would block ticket deletion while comments exist. That is a valid audit-preservation choice, but conflicts less with a parent/child ownership model. Given Core has no delete, either behavior is inert at runtime; **Cascade** was chosen to keep the data model free of orphans if delete is ever introduced.

**Not cascaded:** Deleting a `User` does **not** cascade to tickets or comments (`Restrict` on `createdById` prevents user deletion while referenced). Users are seed-only and not deleted in Core.

### Nullable `assignedTo` (including while In Progress)

`assignedToId` is optional (`String?`) with no check constraint tying it to status. Clearing assignee to `null` on an `IN_PROGRESS` ticket is valid application behavior on non-terminal tickets. Terminal-ticket read-only rules are enforced in the **service layer**, not by nullable FK design.
