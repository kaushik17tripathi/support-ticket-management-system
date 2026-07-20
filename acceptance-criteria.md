# Acceptance Criteria

## Core

- [ ] Seeded users (`id`, `name`, `email`, `role`) are available in the system with no UI to create, edit, or delete users.
- [ ] The acting user for ticket and comment operations is selected via a dropdown of seeded users (no authentication).
- [ ] A ticket can be created with `title`, `description`, and `priority`; `status` defaults to `Open`.
- [ ] On ticket create, `createdBy` is set to the currently selected user from the dropdown.
- [ ] On ticket create, `assignedTo` is optional and may be left unset.
- [ ] On ticket create, `createdAt` and `updatedAt` are set automatically by the system.
- [ ] The ticket list displays enough information to identify and triage tickets (e.g., title, status, priority, assignee, created date).
- [ ] The ticket list returns all matching tickets with no pagination or sorting in Core.
- [ ] A single ticket can be viewed showing all ticket fields and its full comment history.
- [ ] Comments on a ticket detail view are shown in chronological order (oldest first).
- [ ] A non-terminal ticket's `title`, `description`, `priority`, and `assignedTo` can be updated.
- [ ] `priority` and `assignedTo` can be changed at any non-terminal ticket status.
- [ ] A successful ticket update refreshes `updatedAt`.
- [ ] A ticket can be moved from **Open** to **In Progress**.
- [ ] A ticket can be moved from **In Progress** to **Resolved**.
- [ ] A ticket can be moved from **Resolved** to **Closed**.
- [ ] A ticket can be moved from **Open** to **Cancelled**.
- [ ] A ticket can be moved from **In Progress** to **Cancelled**.
- [ ] A ticket can be moved to **In Progress** without an `assignedTo` value set.
- [ ] The UI disables or hides status transition options that are not valid for the ticket's current status.
- [ ] A comment with a `message` can be added to a non-terminal ticket.
- [ ] On comment create, `createdBy` and `createdAt` are set automatically from the selected acting user.
- [ ] Comments are associated with exactly one ticket via `ticketId`.
- [ ] Keyword search matches tickets by `title` and `description` only (not comments or assignee name).
- [ ] Keyword search is case-insensitive (e.g., `login` matches `Login Issue`).
- [ ] An empty search query returns all tickets subject to the active status filter.
- [ ] A single-status filter shows only tickets in the selected status.
- [ ] Keyword search and single-status filter can be applied together.
- [ ] Closed and Cancelled tickets are fully read-only: no field edits, no status changes, and no new comments.
- [ ] Reopening Closed or Cancelled tickets is not supported in Core.
- [ ] Existing comments remain visible on tickets that have become Closed or Cancelled.
- [ ] Duplicate ticket titles are allowed (tickets are identified by `id`).
- [ ] No delete operation exists for tickets or comments in Core.
- [ ] All seeded users can perform all ticket and comment operations regardless of `role` value.

## Validation

- [ ] Ticket create is rejected when `title` is missing or whitespace-only.
- [ ] Ticket create is rejected when `description` is missing or whitespace-only.
- [ ] Ticket create is rejected when `priority` is missing.
- [ ] Ticket create is rejected when `priority` is not one of `Low`, `Medium`, `High`, or `Critical`.
- [ ] Ticket update is rejected when `priority` is not one of `Low`, `Medium`, `High`, or `Critical`.
- [ ] Ticket create/update is rejected when `assignedTo` references a non-existent user ID.
- [ ] `createdBy` on ticket create is set server-side from the selected acting user and is not freely overridden by the client.
- [ ] Transition **Open → Resolved** is rejected by the backend.
- [ ] Transition **Open → Closed** is rejected by the backend.
- [ ] Transition **In Progress → Open** is rejected by the backend.
- [ ] Transition **In Progress → Closed** is rejected by the backend.
- [ ] Transition **Resolved → Open** is rejected by the backend.
- [ ] Transition **Resolved → In Progress** is rejected by the backend.
- [ ] Transition **Resolved → Cancelled** is rejected by the backend.
- [ ] Any status transition from **Closed** to another status is rejected by the backend.
- [ ] Any status transition from **Cancelled** to another status is rejected by the backend.
- [ ] A request with an unknown status value (e.g., `Pending`) is rejected with a validation error before state-machine evaluation.
- [ ] Same-state status transitions (e.g., Open → Open) are handled consistently between the API and UI.
- [ ] Field updates on a **Closed** ticket are rejected by the backend.
- [ ] Field updates on a **Cancelled** ticket are rejected by the backend.
- [ ] Status changes on a **Closed** ticket are rejected by the backend.
- [ ] Status changes on a **Cancelled** ticket are rejected by the backend.
- [ ] Comment create is rejected when `message` is missing or whitespace-only.
- [ ] Comment create is rejected when `ticketId` does not reference an existing ticket.
- [ ] Comment create is rejected when the target ticket is **Closed**.
- [ ] Comment create is rejected when the target ticket is **Cancelled**.
- [ ] An invalid status value in the list filter parameter returns a validation error.
- [ ] Status transitions are atomic — a failed transition does not leave the ticket in an inconsistent intermediate state.

## Error Handling

- [ ] Viewing, updating, or commenting on a non-existent ticket returns 404 with a clear UI message.
- [ ] Invalid state transitions return a structured backend error with a human-readable, actionable UI message.
- [ ] Validation failures return structured backend errors; the UI surfaces all field-level errors, not only the first.
- [ ] When two users attempt conflicting status transitions on the same ticket, one succeeds and the other receives a conflict or stale-state error (e.g., 409).
- [ ] A stale status transition error prompts the user to refresh the ticket and retry.
- [ ] A server error (5xx) shows a generic UI message and does not expose stack traces.
- [ ] A network failure during create or update shows a retry-friendly UI message and does not assume success.
- [ ] A successful status change is visually confirmed in the UI (e.g., updated status or success feedback).
- [ ] Terminal tickets are visually distinct in the UI and show no edit, transition, or comment actions.
- [ ] The comment form is hidden or disabled on Closed and Cancelled ticket detail views.
- [ ] Attempting to comment on a terminal ticket (e.g., via stale page) shows a clear UI error message.
- [ ] Search with no matches shows an empty state (e.g., "No tickets match your search"), not an error.
- [ ] A status filter with no matching tickets shows an empty state, not an error.
- [ ] Combined search and filter yielding zero results is distinguishable from having no tickets in the system.
- [ ] Search and filter operations show loading feedback and do not present stale results as current without indication.
- [ ] A ticket detail view with no comments shows an empty comment state, not an error.
- [ ] Search input with special characters (`%`, `_`, quotes) does not cause query errors or injection failures.

## Testing

- [ ] Each valid status transition (Open → In Progress, In Progress → Resolved, Resolved → Closed, Open → Cancelled, In Progress → Cancelled) has an automated test confirming success.
- [ ] Each rejected transition class (Open → Resolved, Open → Closed, In Progress → Open, In Progress → Closed, Resolved → Open, Resolved → In Progress, Resolved → Cancelled, Closed → any, Cancelled → any) has an automated test confirming rejection.
- [ ] Ticket create and update validation (required fields, priority enum, invalid `assignedTo`) is covered by automated tests.
- [ ] Comment validation (empty message, invalid `ticketId`, terminal ticket) is covered by automated tests.
- [ ] Terminal-ticket read-only behavior (field update, status change, and comment blocked) is covered by automated tests.
- [ ] Keyword search (case-insensitive, title and description scope, empty query behavior) is covered by automated tests.
- [ ] Single-status filter behavior, including combined search + filter, is covered by automated tests.
- [ ] Persistence across application restart is covered by an automated or repeatable manual test (tickets, comments, and seeded users survive restart).
- [ ] Concurrent or stale status transition conflict behavior is covered by an automated test.

## Documentation

- [ ] Allowed status transitions in the implementation match the five valid transitions defined in requirements-analysis.md.
- [ ] Rejected transition classes documented or encoded in the authoritative backend state-machine logic match requirements-analysis.md.
- [ ] Acting-user selection (dropdown of seeded users, no auth) is documented for anyone running or demoing the application.
- [ ] Terminal-ticket read-only rules (no edits, no transitions, no new comments) are documented consistently with requirements-analysis.md.
