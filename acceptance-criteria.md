# Acceptance Criteria

## Core

- [x] Seeded users (`id`, `name`, `email`, `role`) are available in the system with no UI to create, edit, or delete users.
- [x] The acting user for ticket and comment operations is selected via a dropdown of seeded users (no authentication).
- [x] A ticket can be created with `title`, `description`, and `priority`; `status` defaults to `Open`.
- [x] On ticket create, `createdBy` is set to the currently selected user from the dropdown.
- [x] On ticket create, `assignedTo` is optional and may be left unset.
- [x] On ticket create, `createdAt` and `updatedAt` are set automatically by the system.
- [x] The ticket list displays enough information to identify and triage tickets (e.g., title, status, priority, assignee, created date).
- [x] The ticket list returns all matching tickets with no pagination or sorting in Core.
- [x] A single ticket can be viewed showing all ticket fields and its full comment history.
- [x] Comments on a ticket detail view are shown in chronological order (oldest first).
- [x] A non-terminal ticket's `title`, `description`, `priority`, and `assignedTo` can be updated.
- [x] `priority` and `assignedTo` can be changed at any non-terminal ticket status.
- [x] A successful ticket update refreshes `updatedAt`.
- [x] A ticket can be moved from **Open** to **In Progress**.
- [x] A ticket can be moved from **In Progress** to **Resolved**.
- [x] A ticket can be moved from **Resolved** to **Closed**.
- [x] A ticket can be moved from **Open** to **Cancelled**.
- [x] A ticket can be moved from **In Progress** to **Cancelled**.
- [x] A ticket can be moved to **In Progress** without an `assignedTo` value set.
- [x] The UI disables or hides status transition options that are not valid for the ticket's current status.
- [x] A comment with a `message` can be added to a non-terminal ticket.
- [x] On comment create, `createdBy` and `createdAt` are set automatically from the selected acting user.
- [x] Comments are associated with exactly one ticket via `ticketId`.
- [x] Keyword search matches tickets by `title` and `description` only (not comments or assignee name).
- [x] Keyword search is case-insensitive (e.g., `login` matches `Login Issue`).
- [x] An empty search query returns all tickets subject to the active status filter.
- [x] A single-status filter shows only tickets in the selected status.
- [x] Keyword search and single-status filter can be applied together.
- [x] Closed and Cancelled tickets are fully read-only: no field edits, no status changes, and no new comments.
- [x] Reopening Closed or Cancelled tickets is not supported in Core.
- [x] Existing comments remain visible on tickets that have become Closed or Cancelled.
- [x] Duplicate ticket titles are allowed (tickets are identified by `id`).
- [x] No delete operation exists for tickets or comments in Core.
- [x] All seeded users can perform all ticket and comment operations regardless of `role` value.

## Validation

- [x] Ticket create is rejected when `title` is missing or whitespace-only.
- [x] Ticket create is rejected when `description` is missing or whitespace-only.
- [x] Ticket create is rejected when `priority` is missing.
- [x] Ticket create is rejected when `priority` is not one of `Low`, `Medium`, `High`, or `Critical`.
- [x] Ticket update is rejected when `priority` is not one of `Low`, `Medium`, `High`, or `Critical`.
- [x] Ticket create/update is rejected when `assignedTo` references a non-existent user ID.
- [x] `createdBy` on ticket create is set server-side from the selected acting user and is not freely overridden by the client.
- [x] Transition **Open → Resolved** is rejected by the backend.
- [x] Transition **Open → Closed** is rejected by the backend.
- [x] Transition **In Progress → Open** is rejected by the backend.
- [x] Transition **In Progress → Closed** is rejected by the backend.
- [x] Transition **Resolved → Open** is rejected by the backend.
- [x] Transition **Resolved → In Progress** is rejected by the backend.
- [x] Transition **Resolved → Cancelled** is rejected by the backend.
- [x] Any status transition from **Closed** to another status is rejected by the backend.
- [x] Any status transition from **Cancelled** to another status is rejected by the backend.
- [x] A request with an unknown status value (e.g., `Pending`) is rejected with a validation error before state-machine evaluation.
- [x] Same-state status transitions (e.g., Open → Open) are handled consistently between the API and UI.
- [x] Field updates on a **Closed** ticket are rejected by the backend.
- [x] Field updates on a **Cancelled** ticket are rejected by the backend.
- [x] Status changes on a **Closed** ticket are rejected by the backend.
- [x] Status changes on a **Cancelled** ticket are rejected by the backend.
- [x] Comment create is rejected when `message` is missing or whitespace-only.
- [x] Comment create is rejected when `ticketId` does not reference an existing ticket.
- [x] Comment create is rejected when the target ticket is **Closed**.
- [x] Comment create is rejected when the target ticket is **Cancelled**.
- [x] An invalid status value in the list filter parameter returns a validation error.
- [x] Status transitions are atomic — a failed transition does not leave the ticket in an inconsistent intermediate state.

## Error Handling

- [x] Viewing, updating, or commenting on a non-existent ticket returns 404 with a clear UI message.
- [x] Invalid state transitions return a structured backend error with a human-readable, actionable UI message.
- [x] Validation failures return structured backend errors; the UI surfaces all field-level errors, not only the first.
- [x] When two users attempt conflicting status transitions on the same ticket, one succeeds and the other receives a conflict or stale-state error (e.g., 409).
- [x] A stale status transition error prompts the user to refresh the ticket and retry.
- [x] A server error (5xx) shows a generic UI message and does not expose stack traces.
- [x] A network failure during create or update shows a retry-friendly UI message and does not assume success.
- [x] A successful status change is visually confirmed in the UI (e.g., updated status or success feedback).
- [x] Terminal tickets are visually distinct in the UI and show no edit, transition, or comment actions.
- [x] The comment form is hidden or disabled on Closed and Cancelled ticket detail views.
- [x] Attempting to comment on a terminal ticket (e.g., via stale page) shows a clear UI error message.
- [x] Search with no matches shows an empty state (e.g., "No tickets match your search"), not an error.
- [x] A status filter with no matching tickets shows an empty state, not an error.
- [x] Combined search and filter yielding zero results is distinguishable from having no tickets in the system.
- [x] Search and filter operations show loading feedback and do not present stale results as current without indication.
- [x] A ticket detail view with no comments shows an empty comment state, not an error.
- [x] Search input with special characters (`%`, `_`, quotes) does not cause query errors or injection failures.

## Testing

- [x] Each valid status transition (Open → In Progress, In Progress → Resolved, Resolved → Closed, Open → Cancelled, In Progress → Cancelled) has an automated test confirming success.
- [x] Each rejected transition class (Open → Resolved, Open → Closed, In Progress → Open, In Progress → Closed, Resolved → Open, Resolved → In Progress, Resolved → Cancelled, Closed → any, Cancelled → any) has an automated test confirming rejection.
- [x] Ticket create and update validation (required fields, priority enum, invalid `assignedTo`) is covered by automated tests.
- [x] Comment validation (empty message, invalid `ticketId`, terminal ticket) is covered by automated tests.
- [x] Terminal-ticket read-only behavior (field update, status change, and comment blocked) is covered by automated tests.
- [x] Keyword search (case-insensitive, title and description scope, empty query behavior) is covered by automated tests.
- [x] Single-status filter behavior, including combined search + filter, is covered by automated tests.
- [x] Persistence across application restart is covered by an automated or repeatable manual test (tickets, comments, and seeded users survive restart).
- [x] Concurrent or stale status transition conflict behavior is covered by an automated test.

## Documentation

- [x] Allowed status transitions in the implementation match the five valid transitions defined in requirements-analysis.md.
- [x] Rejected transition classes documented or encoded in the authoritative backend state-machine logic match requirements-analysis.md.
- [x] Acting-user selection (dropdown of seeded users, no auth) is documented for anyone running or demoing the application.
- [x] Terminal-ticket read-only rules (no edits, no transitions, no new comments) are documented consistently with requirements-analysis.md.

## Stretch

- [x] End-to-end UI verification covers create, search, filter, lifecycle transitions, comments, and terminal read-only presentation.
- [x] Data persistence across application restart is verified (tickets, comments, seeded users).
- [x] Concurrent or stale status updates surface `409 STATUS_CONFLICT` with UI recovery.
- [x] CI pipeline runs backend unit tests, integration tests, and frontend production build.
- [x] API contract is documented in machine-readable form (`api-contract.md` / OpenAPI-aligned).
- [x] Advanced search handles special characters (`%`, `_`, `\`) as literal substrings.
- [x] Docker Compose (or equivalent) documents one-command local stack startup.
- [x] Full prompt history and AI workflow artifacts are included for assessment review.
