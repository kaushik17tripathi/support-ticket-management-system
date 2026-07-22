# UI Flow

Frontend screen flows for the Support Ticket Management System (Core). API shapes and error codes are defined in `api-contract.md`; this document describes how the React app consumes them.

**Core principle — mirror, don't duplicate:** The UI never maintains a client-side state-machine map. Status transition controls are rendered **only** from `allowedStatuses` returned by the API (`GET /tickets/:id`, `POST /tickets`, `PATCH` responses). After every successful mutation or error that may have changed server state, refetch ticket data and re-derive controls from the latest `allowedStatuses`.

---

## Global layout

```
┌─────────────────────────────────────────────────────────────┐
│  App header: title + Acting user dropdown + nav links       │
├─────────────────────────────────────────────────────────────┤
│  Main content (route outlet)                                │
│    /              → Ticket list                             │
│    /tickets/new   → Create ticket form                      │
│    /tickets/:id   → Ticket detail                           │
└─────────────────────────────────────────────────────────────┘
```

- Persistent header on all screens.
- Primary navigation: **Tickets** (list), **New ticket** (create).
- No authentication UI — acting user is a demo attribution mechanism.

---

## 1. Acting-user selection

### Purpose

Select which seeded user performs writes (`createdBy` on tickets/comments). Required before any mutating API call.

### API

| Call | When |
|------|------|
| `GET /api/users` | On app load (and on retry after fetch failure) |

### UI behaviour

- **Control:** `<select>` in the header labelled “Acting as”.
- **Options:** `name` (and optionally `role`) from `data[]`; value = `User.id`.
- **Persistence:** Save selected `User.id` to `localStorage` (e.g. key `actingUserId`). Restore on reload; if stored ID is missing from fresh `GET /users`, clear storage and prompt re-selection.
- **Empty state:** If no user selected, show inline prompt in header (“Select a user to create or edit tickets”). Disable submit buttons on create/edit/comment/status forms until selected.
- **Read-only views:** List and detail `GET` requests work without a selection; writes require it.

### Errors

| Code | Surfacing |
|------|-----------|
| Network / `500` | Banner in header: “Could not load users — retry.” |
| (n/a for GET users) | |

---

## 2. Ticket list screen

**Route:** `/`

### Purpose

Browse, search, and filter tickets; navigate to detail or create.

### API

| Call | When |
|------|------|
| `GET /api/tickets?search=&status=` | On mount, when search/filter changes (debounced search ~300ms), after returning from create |

Query params:

- `search` — omitted or empty string = no keyword filter.
- `status` — omitted = all statuses; one `TicketStatus` enum value when filter active.

### Layout intent

```
[ Search input                    ] [ Status filter ▼ ] [ + New ticket ]

┌──────────────────────────────────────────────────────┐
│ Title          │ Status │ Priority │ Assignee │ Created │
├────────────────┼────────┼──────────┼──────────┼─────────┤
│ Login Issue    │ OPEN   │ HIGH     │ Priya S. │ Jul 18  │
│ ...            │        │          │          │         │
└──────────────────────────────────────────────────────┘
                                    Showing N ticket(s)
```

- Table or card list — each row links to `/tickets/:id`.
- Status filter: dropdown with “All statuses” + each `TicketStatus` (display labels: “Open”, “In Progress”, etc.).
- Search: single text input; debounced; searches `title` and `description` (server-side).

### States

| State | Presentation |
|-------|----------------|
| **Loading** | Skeleton rows or spinner; keep prior results visible if refetching |
| **Empty (no tickets in DB)** | “No tickets yet” + prominent “Create ticket” CTA |
| **Empty (no matches)** | “No tickets match your search/filter” + “Clear filters” action |
| **Success** | Render `data[]`; show `meta.count` |
| **Error** | Full-width error banner with retry; do not clear last good results on background refetch failure |

### Interactions

- Click row → navigate to `/tickets/:id`.
- Change search or status → refetch list.
- “New ticket” → `/tickets/new`.

### Errors

| HTTP | Code | Surfacing |
|------|------|-----------|
| `400` | `VALIDATION_ERROR` | Inline under status filter (“Invalid status value”) |
| `500` / network | — | Banner + retry button |

---

## 3. Create ticket screen

**Route:** `/tickets/new`

### Purpose

Create a ticket with required fields; redirect to detail on success.

### API

| Call | When |
|------|------|
| `GET /api/users` | Populate assignee dropdown (may reuse cached users from context) |
| `POST /api/tickets` | Form submit |

Headers: `X-Acting-User-Id`, `Content-Type: application/json`.

### Form fields

| Field | Control | Required | Notes |
|-------|---------|----------|-------|
| `title` | text input | Yes | Trim whitespace |
| `description` | textarea | Yes | Trim whitespace |
| `priority` | select | Yes | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` — no default; placeholder “Select priority” |
| `assignedToId` | select | No | “Unassigned” option → omit or `null`; user IDs from `GET /users` |

Do **not** send `status` or `createdById` in the body.

### Layout intent

- Single-column form with labels, field-level error slots, Cancel (→ list) and Create buttons.
- Create disabled when acting user not selected or while submitting.

### Success

- `201` → navigate to `/tickets/:id` for `data.id`.
- Optionally show brief success toast before redirect.

### Errors

| HTTP | Code | Surfacing |
|------|------|-----------|
| `400` | `VALIDATION_ERROR` | Map `error.details[]` to fields by `field` key |
| `400` | `INVALID_ACTING_USER` | Header-level alert: re-select acting user |
| `500` / network | — | Form-level banner; preserve user input |

---

## 4. Ticket detail screen

**Route:** `/tickets/:id`

### Purpose

View ticket metadata, edit fields, transition status, read and add comments.

### API

| Call | When |
|------|------|
| `GET /api/tickets/:id` | On mount, after mutations, on `409`/`422` recovery |
| `GET /api/users` | Assignee dropdown in edit mode |
| `PATCH /api/tickets/:id` | Save field edits |
| `PATCH /api/tickets/:id/status` | Status transition button click |
| `POST /api/tickets/:id/comments` | Comment form submit |

All mutating calls include `X-Acting-User-Id`.

### Layout intent (non-terminal)

```
[ ← Back to tickets ]                    [ Edit ] [ Save ] [ Cancel ]

Title: Login Issue
Status: IN_PROGRESS          Priority: HIGH
Assignee: Alex Kim           Created by: James Chen · Jul 17
Updated: Jul 20

Description:
  User cannot log in with SSO...

Status actions (from allowedStatuses only):
  [ Mark Resolved ]  [ Cancel ticket ]

Comments (oldest first)
  ┌─────────────────────────────────────┐
  │ Alex Kim · Jul 17 09:30             │
  │ Pulled gateway logs — ...           │
  └─────────────────────────────────────┘

  [ Add comment textarea ]  [ Post ]
```

### View vs edit mode (non-terminal only)

| Mode | Behaviour |
|------|-----------|
| **View** | Fields read-only; “Edit” enables edit mode |
| **Edit** | `title`, `description`, `priority`, `assignedTo` editable; Save → `PATCH /tickets/:id`; Cancel → discard local changes, exit edit mode |

- `createdBy`, `status`, timestamps always read-only in UI.
- `assignedToId: null` → “Unassigned” in assignee select.

### Status transitions

- Render one button per entry in `data.allowedStatuses`.
- Button label = human-readable target status (e.g. `IN_PROGRESS` → “Start progress”).
- On click:
  1. `PATCH /api/tickets/:id/status` with `{ status: <target>, expectedStatus: data.status }`.
  2. On `200` → replace local ticket with response `data` (includes updated `allowedStatuses`).
- **Never** show transitions not in `allowedStatuses`, even if the user “knows” the state machine.

### Comments

- List `data.comments` oldest → newest.
- Each item: author `name`, `createdAt`, `message`.
- Add form: textarea + Post; `POST` with `{ message }`.
- On `201` → append comment or refetch detail (refetch preferred for consistency).

### Loading / not found

| State | Presentation |
|-------|----------------|
| Loading | Skeleton or spinner for detail panel |
| `404` | “Ticket not found” + link to list |
| Error (other) | Banner + retry |

---

## 5. Terminal ticket presentation (`CLOSED`, `CANCELLED`)

When `data.status` is `CLOSED` or `CANCELLED` (and `allowedStatuses` is `[]`):

### Visual treatment

- Muted/neutral background or border on detail card.
- Prominent read-only banner: “This ticket is closed and cannot be modified.” / “This ticket was cancelled and cannot be modified.”
- Status badge uses distinct terminal styling (e.g. grey for Closed, amber for Cancelled).

### Disabled / hidden controls

| Control | Behaviour |
|---------|-----------|
| Edit / Save | Hidden |
| Status action buttons | Hidden (none in `allowedStatuses`) |
| Comment form | Hidden |
| Field inputs | Read-only text display |

### Still visible

- All ticket fields and metadata.
- Existing `comments[]` history (read-only).
- Back navigation to list.

If a stale client attempts a mutation and receives `422 TERMINAL_TICKET_READ_ONLY`, refetch detail and switch to terminal presentation.

---

## 6. Error state handling (cross-screen)

All errors use `ErrorResponse` from `api-contract.md`:

```json
{ "error": { "code": "...", "message": "...", "details": [...] } }
```

### Mapping by code

| HTTP | `error.code` | Global behaviour | Screen-specific |
|------|--------------|------------------|-----------------|
| `400` | `VALIDATION_ERROR` | — | Map `details[].field` → inline field errors; generic banner if no field match |
| `400` | `INVALID_ACTING_USER` | Header alert | Block submit until user re-selected |
| `404` | `NOT_FOUND` | — | Detail: not-found page; list refetch unlikely |
| `409` | `STATUS_CONFLICT` | — | Detail status actions: “Ticket was updated by someone else” → auto-refetch `GET /tickets/:id` → user retries transition with fresh `expectedStatus` |
| `422` | `INVALID_STATUS_TRANSITION` | — | Banner on detail; refetch to resync `allowedStatuses` (button should disappear) |
| `422` | `TERMINAL_TICKET_READ_ONLY` | — | Banner; refetch → terminal presentation |
| `500` | `INTERNAL_ERROR` | Generic “Something went wrong” | Retry button; preserve form input on failed POST/PATCH |
| Network failure | — | “Unable to reach server” | Retry; preserve form input |

### Optimistic concurrency flow (`409`)

Applies to `PATCH /tickets/:id/status` only in Core:

```
User clicks transition
  → PATCH with expectedStatus = last known status
  → 409 STATUS_CONFLICT
  → auto GET /tickets/:id
  → update UI from fresh data
  → show message: "Status changed — please try again"
  → user clicks transition again (now with correct expectedStatus)
```

Do **not** silently retry the transition without refetching — the user must confirm after seeing updated state.

### Mutation in-flight UX

- Disable submit / transition buttons while request pending.
- On failure, re-enable and show error; do not navigate away on failed create.

---

## API quick reference (frontend)

| Screen | Endpoints |
|--------|-----------|
| Global | `GET /api/users` |
| List | `GET /api/tickets` |
| Create | `POST /api/tickets` |
| Detail | `GET /api/tickets/:id`, `PATCH /api/tickets/:id`, `PATCH /api/tickets/:id/status`, `POST /api/tickets/:id/comments` |

Base URL: `http://localhost:3000/api` (dev). Mutating requests require `X-Acting-User-Id`.

---

## Out of scope (Core)

- Authentication / login
- Pagination, sorting, priority filter
- Client-side transition validation or hardcoded transition maps
- User management CRUD
- Reopening terminal tickets
