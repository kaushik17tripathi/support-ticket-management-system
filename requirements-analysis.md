# Requirement Analysis

## My Understanding (in my own words)

This system is a support ticket tracker where users can create tickets, browse and search them, view details, update ticket fields, move tickets through a strict lifecycle, and leave comments on individual tickets. Users exist in the system as seeded data only — there is no UI to create or manage user accounts; they are referenced by ID on tickets and comments (e.g., `createdBy`, `assignedTo`). The acting user is selected from a dropdown of seeded users; there is no authentication.

Each ticket has a title, description, priority, status, optional assignee, creator, and timestamps. Comments are tied to a single ticket and record who wrote them and when. The most important business rule is the **status state machine**: tickets cannot jump arbitrarily between states. They follow a defined path from Open through In Progress to Resolved and finally Closed, with Cancelled available as an exit from Open or In Progress only. Once a ticket is Closed or Cancelled, it is **fully read-only** — no field edits, no status changes, and no new comments.

The UI must support keyword search (title and description, case-insensitive) and single-status filtering so agents can find relevant work quickly. All data must survive application restarts (persistent storage, not in-memory only). The backend is the source of truth for validation — required fields, valid enum values, valid state transitions, and referential integrity must be enforced server-side. The frontend should surface validation and operational errors clearly so users understand what went wrong and what to do next.

## Functional Requirements

### Users

- Users are pre-seeded in the database; no create/read/update/delete UI for user management.
- User records include: `id`, `name`, `email`, `role`.
- Users may be referenced as `createdBy` on tickets and comments, and as `assignedTo` on tickets.
- The acting user for creates, updates, and comments is selected via a dropdown of seeded users (no auth).

### Tickets — Create

- A user can create a ticket with at minimum: `title`, `description`, and `priority`.
- On creation, `status` defaults to **Open**.
- `createdBy` is set to the currently selected user from the dropdown.
- `assignedTo` is optional at creation and may be left unset.
- `createdAt` and `updatedAt` are set automatically by the system.
- The backend rejects creation when required fields are missing, empty, or invalid.

### Tickets — List

- A user can view a list of all matching tickets (no pagination or sorting in Core).
- The list displays enough information to identify and triage tickets (e.g., title, status, priority, assignee, created date).
- The list supports **keyword search** over `title` and `description` only (case-insensitive).
- An empty search query returns all tickets (subject to the active status filter).
- The list supports a **single-status filter** to show only tickets in one selected status.
- Search and status filter may be combined.

### Tickets — View

- A user can open a single ticket and see all ticket fields plus its comment history.
- Comments are shown in chronological order (oldest first, unless product specifies otherwise).

### Tickets — Update

- A user can update editable ticket fields (e.g., `title`, `description`, `priority`, `assignedTo`) on non-terminal tickets.
- `priority` and `assignedTo` may be changed freely at any non-terminal status.
- A user can change `status` only through **allowed transitions** in the state machine (see below).
- `updatedAt` is refreshed on any successful ticket update.
- Tickets in terminal states (`Closed`, `Cancelled`) reject all updates — fields and status are read-only.

### Status State Machine

Allowed transitions only:

| From          | To            |
|---------------|---------------|
| Open          | In Progress   |
| In Progress   | Resolved      |
| Resolved      | Closed        |
| Open          | Cancelled     |
| In Progress   | Cancelled     |

All other transitions must be rejected by the backend with a clear error. Reopening Closed or Cancelled tickets is out of scope for Core.

Implicit disallowed transitions include (non-exhaustive):

- Open → Resolved, Open → Closed
- In Progress → Open, In Progress → Closed
- Resolved → Open, Resolved → In Progress, Resolved → Cancelled
- Closed → any state
- Cancelled → any state

The UI disables or hides invalid transition options for the ticket's current status.

### Comments

- A user can add a comment to an existing **non-terminal** ticket by providing a `message`.
- Comments are **blocked** on Closed and Cancelled tickets; the backend rejects the request and the UI does not offer a comment form.
- `createdBy` and `createdAt` are set automatically from the selected acting user.
- Comments are associated with exactly one ticket via `ticketId`.
- The backend rejects comments with missing or empty `message`, an invalid `ticketId`, or a terminal ticket status.

### Validation and Errors

- All required fields are validated on the backend for create and update operations.
- Invalid state transitions, unknown user IDs, and malformed input return structured error responses.
- The UI displays meaningful error messages for validation failures, not-found cases, and server errors.

### Persistence

- Tickets, comments, and seeded users are stored in a durable datastore.
- Data is retained across application and server restarts.

## Non-Functional Requirements

### Reliability and Data Integrity

- State transitions must be atomic — a ticket cannot end up in an inconsistent intermediate state due to partial writes.
- Referential integrity: `assignedTo`, `createdBy`, and comment `createdBy` must reference valid user IDs; `ticketId` on comments must reference an existing ticket.

### Usability

- Error messages in the UI must be human-readable and actionable (e.g., "Cannot move from Resolved to In Progress" rather than a generic failure).
- Search and filter controls should provide immediate feedback (loading state, empty results, no matches).
- Status changes should be visually confirmable (success feedback or updated status on screen).
- Terminal tickets should be visually distinct and show no edit, transition, or comment actions.

### Performance

- List, search, and filter operations should remain responsive for a reasonable dataset (hundreds to low thousands of tickets without noticeable lag — exact SLA TBD).
- Keyword search should use indexed or efficient query patterns where the datastore supports it.

### Security (baseline)

- Even without a full auth UI, the API should not accept obviously invalid input (injection, oversized payloads).
- Roles do not gate any actions in Core; all seeded users can perform all operations.

### Maintainability

- State machine rules should be enforced in a single, authoritative place on the backend (not duplicated inconsistently in the UI).
- The UI may mirror allowed transitions for UX (disabling invalid options) but must not be the only enforcement layer.

### Testability

- State machine transitions, validation rules, and search/filter logic should be verifiable through automated tests.

## Assumptions

1. **Default status on create** is `Open`.
2. **Priority** is an enumerated value: `Low`, `Medium`, `High`, `Critical`. No default priority is assumed until clarified (see Clarifications).
3. **Status** is an enumerated value: `Open`, `In Progress`, `Resolved`, `Closed`, `Cancelled`.
4. **Keyword search** covers `title` and `description` only — not comments, assignee name, or other fields. Search is case-insensitive. An empty search query returns all tickets (still subject to the active status filter).
5. **Status filter** supports a single status at a time (no multi-select in Core).
6. **`assignedTo`** is optional at all times — including at creation and when moving to In Progress. It may be updated or cleared on non-terminal tickets unless a clarification restricts clearing while In Progress.
7. **Acting user** is selected via a dropdown of seeded users; there is no authentication UI or session management. *Justification: Core is a demo-scope app; a dropdown satisfies `createdBy` attribution without auth infrastructure.*
8. **Terminal tickets** (`Closed`, `Cancelled`) are fully read-only: no field updates, no status changes, and no new comments. Reopening terminal tickets is out of scope for Core. *Justification: terminal means done; read-only prevents accidental post-close edits.*
9. **Timestamps** are stored in UTC and displayed in the user's local timezone or a fixed format.
10. **No pagination or sorting** in Core — the list endpoint returns all matching tickets. *Justification: keeps list UI and API simple for Core scope.*
11. **No delete** operation for tickets or comments in Core.
12. **Roles** (`role` on User) are metadata only and do not gate any actions in Core. *Justification: role-based access is out of scope; all seeded users have full access.*
13. **Priority and assignee** may be changed freely at any non-terminal status.
14. **Status changes do not require** a comment or reason in Core. *Justification: audit-on-transition is a separate feature not in the Core spec.*
15. **Duplicate titles** are allowed. *Justification: no uniqueness constraint was specified; tickets are identified by ID.*
16. **Invalid status transitions** are hidden or disabled in the UI rather than shown as selectable options that error on submit. *Justification: better UX and aligns with backend enforcement.*
17. **Comments** on terminal tickets are blocked, consistent with Assumption #8.

## Clarifications (questions I'd ask a product owner)

1. What is the **default priority** on ticket create when the user does not select one (e.g., default to `Medium`, or require explicit selection)?
2. What are the **maximum lengths** for `title`, `description`, and comment `message`? This directly affects database column sizes and validation rules.
3. When a single update request combines **field changes with an invalid status transition**, should the entire request fail (recommended), or should valid field changes be applied independently?
4. Is clearing **`assignedTo` to null** allowed while a ticket is **In Progress**, or must an assignee remain set once work has started?
5. How should a **same-state status transition** be handled (e.g., Open → Open) — reject with validation error, or treat as an idempotent no-op?

## Edge Cases

### Status State Machine

#### Invalid transitions (must be rejected)

- **Open → Resolved** or **Open → Closed**: skips required In Progress / Resolved steps.
- **In Progress → Open**: backward transition not in the machine; reopening is out of scope for Core.
- **In Progress → Closed**: must go through Resolved first.
- **Resolved → In Progress** or **Resolved → Open**: reopening not supported in Core.
- **Resolved → Cancelled**: cancellation only allowed from Open or In Progress.
- **Closed → any** and **Cancelled → any**: terminal states; all outbound transitions must be rejected.
- **Same-state transition** (e.g., Open → Open): behavior TBD — see Clarifications; must be handled consistently in API and UI.
- **Unknown status value** in request (e.g., `"Pending"`): validation error before state machine check.

#### Terminal state behavior

- Attempting any status change on a **Closed** or **Cancelled** ticket must fail with a clear message.
- Attempting any field update on a **Closed** or **Cancelled** ticket must fail with a clear message.
- UI must not offer edit, transition, or comment actions for terminal tickets (controls hidden or disabled with explanation).

#### Concurrent updates

- Two users attempt to transition the same ticket simultaneously (e.g., one to In Progress, one to Cancelled): only one should succeed; the other receives a conflict or stale-state error based on current status.
- User A moves ticket to Resolved while User B tries Open → In Progress: second request must fail because current status is no longer Open.

#### Field updates vs. status changes

- Updating `title` or `priority` in the same request as an invalid status transition: behavior TBD — see Clarifications; recommended approach is fail-the-whole-request.
- Updating any field on a **Closed** or **Cancelled** ticket: reject; terminal tickets are fully read-only.

#### Assignment and status coupling

- Moving to **In Progress** without an `assignedTo` value: **allowed** — assignee is optional at all times.
- Setting `assignedTo` to null while **In Progress**: behavior TBD — see Clarifications.

#### Cancelled from different states

- **Open → Cancelled**: valid; ticket never entered active work.
- **In Progress → Cancelled**: valid; work was started but abandoned.
- Cancelled tickets retain full existing history and comments for audit purposes; no further changes are permitted.

#### Resolved and Closed distinction

- **Resolved → Closed** is the only path to Closed; ensures a deliberate "confirm closure" step.
- Accidental double-submit on Resolved → Closed should not corrupt data (idempotent if already Closed).

### Ticket CRUD and Fields

- **Empty or whitespace-only** `title`, `description`, or comment `message`: reject with validation error.
- **Missing required fields** on create (no title, no priority): reject with field-level errors.
- **Invalid `priority`** value (not one of Low, Medium, High, Critical): reject.
- **Invalid `assignedTo`** (non-existent user ID): reject with referential integrity error.
- **`createdBy`** on create is set server-side from the selected acting user, not freely overridden by the client.
- **Very long** title/description/message: enforce max length once clarified; reject when over limit.
- **Ticket not found** on view, update, or comment: return 404 with clear UI message.
- **Duplicate titles**: allowed; multiple tickets may share the same title.

### Comments

- Comment on **non-existent ticket**: 404.
- Comment on **Closed** or **Cancelled** ticket: **blocked** — backend rejects with a clear error (e.g., "Cannot add comments to a closed ticket"); UI hides or disables the comment form on terminal tickets.
- **Empty comment** submission: reject.
- **Rapid duplicate comments**: allowed; no deduplication in Core.
- Comment list for ticket with **no comments**: show empty state, not an error.
- Existing comments on a ticket that later becomes terminal remain visible but read-only; no new comments may be added.

### Search and Filter

- **Empty search query**: returns all tickets subject to the active status filter (not an error).
- **Search with no matches**: show empty state with guidance ("No tickets match your search").
- **Status filter with no matches**: empty state, not an error.
- **Search + filter combined** yielding zero results: distinguish "no tickets at all" vs. "no matches for criteria."
- **Special characters** in search (`%`, `_`, quotes): escape properly to avoid query errors or injection.
- **Case-insensitive** search: `"login"` matches `"Login Issue"` in title or description.
- **Status filter set to a terminal status** (Closed, Cancelled): list only historical tickets; UX should make read-only nature clear when drilling into detail.
- **Invalid status in filter parameter**: return validation error (recommended for predictable API behavior).

### Persistence and Restart

- Data written before crash/restart must be **fully persisted** (no partial ticket records).
- **Seed data** for users must load on fresh install; existing ticket data must not be wiped on restart.
- **Migration/schema changes** must not silently drop ticket or comment data.

### UI Error States

- **Network failure** on create/update: show retry-friendly message; do not assume success.
- **Validation error** with multiple fields: surface all errors, not just the first.
- **409 Conflict** on stale status transition: prompt user to refresh ticket and retry.
- **500 Server error**: generic message with optional request ID; do not expose stack traces.
- **Loading states** during search/filter: avoid showing stale results as current without indication.
- **Comment blocked on terminal ticket**: show clear message if user somehow triggers the action (e.g., stale page).

### User and Referential Integrity

- **`assignedTo` references a user** who exists in seed data: allow regardless of `role` value (roles do not gate assignment).
- **User ID in `createdBy` on old comments** if seed data changes between versions: historical records may reference missing users; UI should handle gracefully ("Unknown user").
