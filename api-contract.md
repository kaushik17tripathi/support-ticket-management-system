# Api Contract

REST API for the Support Ticket Management System (Core). All request/response bodies are `application/json`. Timestamps are ISO 8601 UTC strings (e.g., `"2026-07-21T17:30:00.000Z"`).

**Base URL:** `/api` (e.g., `http://localhost:3000/api`)

---

## Conventions

### Enums

Use Prisma enum values (`SCREAMING_SNAKE_CASE`) in all API payloads:

| Enum | Values |
|------|--------|
| `Priority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `TicketStatus` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED` |

### Acting user header

Mutating endpoints require the acting user (no auth session):

| Header | Required on | Description |
|--------|-------------|-------------|
| `X-Acting-User-Id` | `POST /tickets`, `PATCH /tickets/:id`, `PATCH /tickets/:id/status`, `POST /tickets/:id/comments` | Must be a valid seeded `User.id`. Used to set `createdById` on ticket/comment create. Validated server-side; not overridable via request body. |

`GET` endpoints do not require this header.

### Shared types

```jsonc
// UserSummary — nested on tickets and comments
{
  "id": "clx123abc",
  "name": "Jane Agent",
  "email": "jane@example.com",
  "role": "agent"
}

// ErrorResponse — all error responses use this shape
{
  "error": {
    "code": "VALIDATION_ERROR",       // machine-readable code
    "message": "Human-readable summary",
    "details": [                       // optional; field-level errors
      { "field": "title", "message": "Title is required" }
    ]
  }
}
```

### Error codes (cross-cutting)

| HTTP | `error.code` | When |
|------|--------------|------|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields, unknown enum, invalid query param, same-state status transition |
| `400` | `INVALID_ACTING_USER` | Missing, unknown, or malformed `X-Acting-User-Id` |
| `404` | `NOT_FOUND` | Ticket or route target does not exist |
| `409` | `STATUS_CONFLICT` | `expectedStatus` does not match ticket's current status (optimistic concurrency) |
| `422` | `INVALID_STATUS_TRANSITION` | Disallowed state-machine transition |
| `422` | `TERMINAL_TICKET_READ_ONLY` | Field update, status change, or comment on `CLOSED` / `CANCELLED` ticket |
| `500` | `INTERNAL_ERROR` | Unexpected server failure (no stack trace in body) |

---

## Endpoints

### 1. List users (acting-user dropdown)

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/users` |
| **Purpose** | Return all seeded users for the acting-user dropdown. No user-management CRUD in Core. |

#### Request

**Headers:** none required

**Query params:** none

**Body:** none

#### Response (success)

**Status:** `200 OK`

```json
{
  "data": [
    {
      "id": "clx123abc",
      "name": "Jane Agent",
      "email": "jane@example.com",
      "role": "agent"
    },
    {
      "id": "clx456def",
      "name": "Bob Admin",
      "email": "bob@example.com",
      "role": "admin"
    }
  ]
}
```

#### Validation rules

- None.

#### Error responses

| Status | Code | Condition |
|--------|------|-----------|
| `500` | `INTERNAL_ERROR` | Unexpected server failure |

---

### 2. List tickets (search + status filter)

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/tickets` |
| **Purpose** | Return all matching tickets for triage. Supports case-insensitive keyword search on `title` and `description` plus optional single-status filter. No pagination or sorting in Core. |

#### Request

**Headers:** none required

**Query params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Case-insensitive keyword match on `title` and `description` only. Omitted or empty string returns all tickets (subject to `status` filter). |
| `status` | `TicketStatus` | No | Filter to a single status. Omitted returns tickets in any status (subject to `search`). |

**Example:** `GET /tickets?search=login&status=OPEN`

**Body:** none

#### Response (success)

**Status:** `200 OK`

```json
{
  "data": [
    {
      "id": "clx_ticket_1",
      "title": "Login Issue",
      "description": "User cannot log in with SSO",
      "priority": "HIGH",
      "status": "OPEN",
      "assignedTo": null,
      "createdBy": {
        "id": "clx123abc",
        "name": "Jane Agent",
        "email": "jane@example.com",
        "role": "agent"
      },
      "createdAt": "2026-07-21T10:00:00.000Z",
      "updatedAt": "2026-07-21T10:00:00.000Z"
    }
  ],
  "meta": {
    "count": 1
  }
}
```

Returns `{ "data": [], "meta": { "count": 0 } }` when no tickets match (not an error).

#### Validation rules

- `status`, if provided, must be a valid `TicketStatus` enum value.
- `search` special characters (`%`, `_`, `'`, `"`) must be escaped server-side; must not cause query errors.

#### Error responses

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `VALIDATION_ERROR` | Invalid `status` query value (e.g., `status=PENDING`) |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |

---

### 3. Create ticket

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/tickets` |
| **Purpose** | Create a new ticket. `status` defaults to `OPEN`. `createdById` is set from `X-Acting-User-Id`. |

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `X-Acting-User-Id` | Valid `User.id` (required) |
| `Content-Type` | `application/json` |

**Body:**

```json
{
  "title": "Login Issue",
  "description": "User cannot log in with SSO",
  "priority": "HIGH",
  "assignedToId": "clx456def"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Non-empty after trim |
| `description` | string | Yes | Non-empty after trim |
| `priority` | `Priority` | Yes | No default; client must select explicitly |
| `assignedToId` | string \| null | No | Valid `User.id`, or omit/`null` for unassigned |

`status` and `createdById` must **not** be accepted from the client body.

#### Response (success)

**Status:** `201 Created`

```json
{
  "data": {
    "id": "clx_ticket_1",
    "title": "Login Issue",
    "description": "User cannot log in with SSO",
    "priority": "HIGH",
    "status": "OPEN",
    "assignedTo": {
      "id": "clx456def",
      "name": "Bob Admin",
      "email": "bob@example.com",
      "role": "admin"
    },
    "createdBy": {
      "id": "clx123abc",
      "name": "Jane Agent",
      "email": "jane@example.com",
      "role": "agent"
    },
    "allowedStatuses": ["IN_PROGRESS", "CANCELLED"],
    "createdAt": "2026-07-21T10:00:00.000Z",
    "updatedAt": "2026-07-21T10:00:00.000Z",
    "comments": []
  }
}
```

`allowedStatuses` lists valid **target** statuses from the current status (for UI transition controls).

#### Validation rules

- `X-Acting-User-Id` must be present and reference an existing user.
- `title` required; reject if missing or whitespace-only.
- `description` required; reject if missing or whitespace-only.
- `priority` required; must be one of `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `assignedToId`, if provided and non-null, must reference an existing user.
- `status` is always set to `OPEN` server-side.

#### Error responses

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `INVALID_ACTING_USER` | Missing or unknown `X-Acting-User-Id` |
| `400` | `VALIDATION_ERROR` | Missing/empty `title`, `description`, or `priority`; invalid `priority`; invalid `assignedToId` |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |

---

### 4. Get ticket detail

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/tickets/:id` |
| **Purpose** | Return a single ticket with full fields, comment history (oldest first), and allowed status transitions for the UI. |

#### Request

**Headers:** none required

**Path params:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Ticket ID |

**Body:** none

#### Response (success)

**Status:** `200 OK`

```json
{
  "data": {
    "id": "clx_ticket_1",
    "title": "Login Issue",
    "description": "User cannot log in with SSO",
    "priority": "HIGH",
    "status": "IN_PROGRESS",
    "assignedTo": null,
    "createdBy": {
      "id": "clx123abc",
      "name": "Jane Agent",
      "email": "jane@example.com",
      "role": "agent"
    },
    "allowedStatuses": ["RESOLVED", "CANCELLED"],
    "createdAt": "2026-07-21T10:00:00.000Z",
    "updatedAt": "2026-07-21T11:00:00.000Z",
    "comments": [
      {
        "id": "clx_comment_1",
        "ticketId": "clx_ticket_1",
        "message": "Reproduced on Chrome 125",
        "createdBy": {
          "id": "clx123abc",
          "name": "Jane Agent",
          "email": "jane@example.com",
          "role": "agent"
        },
        "createdAt": "2026-07-21T10:30:00.000Z"
      }
    ]
  }
}
```

- `allowedStatuses` is `[]` for terminal tickets (`CLOSED`, `CANCELLED`).
- `comments` is `[]` (not an error) when the ticket has no comments.

#### Validation rules

- `id` must identify an existing ticket.

#### Error responses

| Status | Code | Condition |
|--------|------|-----------|
| `404` | `NOT_FOUND` | Ticket does not exist |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |

---

### 5. Update ticket fields

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/tickets/:id` |
| **Purpose** | Update editable fields on a **non-terminal** ticket: `title`, `description`, `priority`, `assignedToId`. Does **not** change `status` (use `PATCH /tickets/:id/status`). Refreshes `updatedAt` on success. |

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `X-Acting-User-Id` | Valid `User.id` (required) |
| `Content-Type` | `application/json` |

**Path params:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Ticket ID |

**Body** (at least one field required; partial update):

```json
{
  "title": "Login Issue — SSO",
  "description": "Updated repro steps",
  "priority": "CRITICAL",
  "assignedToId": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | If provided, non-empty after trim |
| `description` | string | No | If provided, non-empty after trim |
| `priority` | `Priority` | No | Must be valid enum if provided |
| `assignedToId` | string \| null | No | Valid `User.id`, or `null` to clear assignee (allowed at any non-terminal status, including `IN_PROGRESS`) |

`status` and `createdById` must **not** be accepted in this body.

#### Response (success)

**Status:** `200 OK`

```json
{
  "data": {
    "id": "clx_ticket_1",
    "title": "Login Issue — SSO",
    "description": "Updated repro steps",
    "priority": "CRITICAL",
    "status": "IN_PROGRESS",
    "assignedTo": null,
    "createdBy": {
      "id": "clx123abc",
      "name": "Jane Agent",
      "email": "jane@example.com",
      "role": "agent"
    },
    "allowedStatuses": ["RESOLVED", "CANCELLED"],
    "createdAt": "2026-07-21T10:00:00.000Z",
    "updatedAt": "2026-07-21T12:00:00.000Z",
    "comments": []
  }
}
```

#### Validation rules

- `X-Acting-User-Id` must be present and reference an existing user.
- Ticket must exist and must **not** be `CLOSED` or `CANCELLED`.
- At least one updatable field must be present in the body.
- If `title` or `description` is provided, it must be non-empty after trim.
- If `priority` is provided, must be a valid `Priority` enum.
- If `assignedToId` is provided and non-null, must reference an existing user.
- `assignedToId: null` clears the assignee (valid while `IN_PROGRESS`).
- `status` and `createdById` must not appear in the request body.

#### Check order

When multiple failure conditions could apply, evaluate in this sequence and **return on first failure**:

1. **`X-Acting-User-Id` present and references an existing user?** → else `400 INVALID_ACTING_USER`
2. **Body contains at least one updatable field** (`title`, `description`, `priority`, `assignedToId`)? → else `400 VALIDATION_ERROR`
3. **Provided field values are syntactically valid** (no `status`/`createdById` in body; non-empty `title`/`description` if provided; valid `Priority` if provided)? → else `400 VALIDATION_ERROR`
4. **Ticket exists?** → else `404 NOT_FOUND`
5. **Ticket is terminal (`CLOSED` / `CANCELLED`)?** → else `422 TERMINAL_TICKET_READ_ONLY` — checked before referential checks, since a terminal ticket is rejected regardless of field values
6. **`assignedToId`, if provided and non-null, references an existing user?** → else `400 VALIDATION_ERROR`

#### Error responses

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `INVALID_ACTING_USER` | Missing or unknown `X-Acting-User-Id` |
| `400` | `VALIDATION_ERROR` | Empty body; whitespace-only `title`/`description`; invalid `priority` or `assignedToId` |
| `404` | `NOT_FOUND` | Ticket does not exist |
| `422` | `TERMINAL_TICKET_READ_ONLY` | Ticket is `CLOSED` or `CANCELLED` |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |

---

### 6. Transition ticket status

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/tickets/:id/status` |
| **Purpose** | Move a ticket to a new status via the state machine. Uses **optimistic concurrency**: client sends `expectedStatus` (the status it believes the ticket is in); server rejects with `409` if the current status differs. Transition is atomic. |

#### Valid transitions

| From (`expectedStatus`) | To (`status`) |
|-------------------------|---------------|
| `OPEN` | `IN_PROGRESS` |
| `OPEN` | `CANCELLED` |
| `IN_PROGRESS` | `RESOLVED` |
| `IN_PROGRESS` | `CANCELLED` |
| `RESOLVED` | `CLOSED` |

All other transitions are rejected (see error responses below).

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `X-Acting-User-Id` | Valid `User.id` (required) |
| `Content-Type` | `application/json` |

**Path params:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Ticket ID |

**Body:**

```json
{
  "status": "IN_PROGRESS",
  "expectedStatus": "OPEN"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `TicketStatus` | Yes | Target status |
| `expectedStatus` | `TicketStatus` | Yes | Status the client last read; used for optimistic concurrency |

#### Response (success)

**Status:** `200 OK`

```json
{
  "data": {
    "id": "clx_ticket_1",
    "title": "Login Issue",
    "description": "User cannot log in with SSO",
    "priority": "HIGH",
    "status": "IN_PROGRESS",
    "assignedTo": null,
    "createdBy": {
      "id": "clx123abc",
      "name": "Jane Agent",
      "email": "jane@example.com",
      "role": "agent"
    },
    "allowedStatuses": ["RESOLVED", "CANCELLED"],
    "createdAt": "2026-07-21T10:00:00.000Z",
    "updatedAt": "2026-07-21T12:05:00.000Z",
    "comments": []
  }
}
```

#### Validation rules

- `X-Acting-User-Id` must be present and reference an existing user.
- Ticket must exist and must **not** be `CLOSED` or `CANCELLED`.
- `status` and `expectedStatus` must be valid `TicketStatus` enum values.
- `expectedStatus` must equal the ticket's **current** status in the database; otherwise `409 STATUS_CONFLICT`.
- `status` must be a permitted transition from the current status (see valid transitions table).
- Same-state transition (`status` === current): reject with `400 VALIDATION_ERROR` (consistent no-op rejection).
- Transition does not require `assignedToId` to be set (ticket may be unassigned when moving to `IN_PROGRESS`).
- On success, only `status` and `updatedAt` change; other fields are untouched.

#### Check order

When multiple failure conditions could apply, evaluate in this sequence and **return on first failure**:

1. **`X-Acting-User-Id` present and references an existing user?** → else `400 INVALID_ACTING_USER`
2. **Body contains `status` and `expectedStatus`?** → else `400 VALIDATION_ERROR`
3. **`status` and `expectedStatus` are valid `TicketStatus` enum values?** → else `400 VALIDATION_ERROR` — **must run before step 6**; an invalid enum (e.g., `PENDING`) must not produce `409 STATUS_CONFLICT`
4. **Ticket exists?** → else `404 NOT_FOUND`
5. **Ticket is terminal (`CLOSED` / `CANCELLED`)?** → else `422 TERMINAL_TICKET_READ_ONLY` — checked **before** concurrency, since a terminal ticket is rejected regardless of `expectedStatus`
6. **`expectedStatus` matches ticket's current status?** → else `409 STATUS_CONFLICT`
7. **`status` equals current status (same-state transition)?** → else `400 VALIDATION_ERROR`
8. **Transition from current status to `status` is permitted?** → else `422 INVALID_STATUS_TRANSITION`

**Correction vs. naive ordering:** Enum validation (step 3) precedes the concurrency check (step 6). Terminal check (step 5) precedes concurrency (step 6), so a `CLOSED` ticket with a stale `expectedStatus` returns `422`, not `409`.

#### Error responses

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `INVALID_ACTING_USER` | Missing or unknown `X-Acting-User-Id` |
| `400` | `VALIDATION_ERROR` | Missing `status` or `expectedStatus`; unknown enum; same-state transition |
| `404` | `NOT_FOUND` | Ticket does not exist |
| `409` | `STATUS_CONFLICT` | `expectedStatus` does not match current ticket status (stale read or concurrent update) |
| `422` | `TERMINAL_TICKET_READ_ONLY` | Ticket is `CLOSED` or `CANCELLED` |
| `422` | `INVALID_STATUS_TRANSITION` | Disallowed transition (e.g., `OPEN` → `RESOLVED`, `RESOLVED` → `IN_PROGRESS`) |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |

**Example `409` body:**

```json
{
  "error": {
    "code": "STATUS_CONFLICT",
    "message": "Ticket status has changed. Expected OPEN but current status is IN_PROGRESS.",
    "details": [
      { "field": "expectedStatus", "message": "Refresh the ticket and retry." }
    ]
  }
}
```

**Example `422` invalid transition body:**

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition from OPEN to RESOLVED.",
    "details": [
      { "field": "status", "message": "Allowed targets from OPEN: IN_PROGRESS, CANCELLED" }
    ]
  }
}
```

---

### 7. Create comment

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/tickets/:id/comments` |
| **Purpose** | Add a comment to a **non-terminal** ticket. `createdById` is set from `X-Acting-User-Id`. |

#### Request

**Headers:**

| Header | Value |
|--------|-------|
| `X-Acting-User-Id` | Valid `User.id` (required) |
| `Content-Type` | `application/json` |

**Path params:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Ticket ID |

**Body:**

```json
{
  "message": "Reproduced on Chrome 125"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | Non-empty after trim |

`createdById` must **not** be accepted from the client body.

#### Response (success)

**Status:** `201 Created`

```json
{
  "data": {
    "id": "clx_comment_1",
    "ticketId": "clx_ticket_1",
    "message": "Reproduced on Chrome 125",
    "createdBy": {
      "id": "clx123abc",
      "name": "Jane Agent",
      "email": "jane@example.com",
      "role": "agent"
    },
    "createdAt": "2026-07-21T10:30:00.000Z"
  }
}
```

#### Validation rules

- `X-Acting-User-Id` must be present and reference an existing user.
- Ticket must exist and must **not** be `CLOSED` or `CANCELLED`.
- `message` required; reject if missing or whitespace-only.

#### Check order

When multiple failure conditions could apply, evaluate in this sequence and **return on first failure**:

1. **`X-Acting-User-Id` present and references an existing user?** → else `400 INVALID_ACTING_USER`
2. **`message` present and non-empty after trim?** → else `400 VALIDATION_ERROR`
3. **Ticket exists?** → else `404 NOT_FOUND`
4. **Ticket is terminal (`CLOSED` / `CANCELLED`)?** → else `422 TERMINAL_TICKET_READ_ONLY` — checked after existence, since terminal status is only known once the ticket is loaded

#### Error responses

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `INVALID_ACTING_USER` | Missing or unknown `X-Acting-User-Id` |
| `400` | `VALIDATION_ERROR` | Missing or whitespace-only `message` |
| `404` | `NOT_FOUND` | Ticket does not exist |
| `422` | `TERMINAL_TICKET_READ_ONLY` | Ticket is `CLOSED` or `CANCELLED` |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |

---

## State machine reference

### Allowed transitions

```
OPEN          → IN_PROGRESS, CANCELLED
IN_PROGRESS   → RESOLVED, CANCELLED
RESOLVED      → CLOSED
CLOSED        → (none — terminal)
CANCELLED     → (none — terminal)
```

### Rejected transition classes

| Class | Examples |
|-------|----------|
| Skip-ahead | `OPEN` → `RESOLVED`, `OPEN` → `CLOSED`, `IN_PROGRESS` → `CLOSED` |
| Backward / reopen | `IN_PROGRESS` → `OPEN`, `RESOLVED` → `OPEN`, `RESOLVED` → `IN_PROGRESS` |
| Late cancel | `RESOLVED` → `CANCELLED` |
| Terminal outbound | `CLOSED` → any, `CANCELLED` → any |
| Same-state | `OPEN` → `OPEN` (rejected with `400`) |

---

## Out of scope (Core)

The following are **not** exposed by this API contract:

- User create/update/delete
- Ticket or comment delete
- Pagination or sorting on `GET /tickets`
- Status change audit comments
- Authentication / session management
- Reopening `CLOSED` or `CANCELLED` tickets
