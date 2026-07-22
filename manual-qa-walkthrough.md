# Manual QA Walkthrough

Structured UI and API smoke test for the Support Ticket Management System. Run after `README.md` setup (backend `:3000`, frontend `:5173`, seed data loaded).

**Tester:** _______________  
**Date:** _______________  
**Browser:** _______________  
**Result:** ☐ Pass  ☐ Fail (note steps below)

---

## Prerequisites

```bash
# Terminal 1
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Confirm header shows “Support Tickets” and acting-user dropdown.

---

## Section A — Acting user

| Step | Action | Expected | AC refs |
|------|--------|----------|---------|
| A1 | Open app without selecting a user | Hint: “Select a user to create or edit tickets”; create/edit disabled | Core #2 |
| A2 | Open acting-user dropdown | Lists 5 seeded users (names + roles) | Core #1 |
| A3 | Select **James Chen** (admin) | Selection persists | Core #2, Docs |
| A4 | Reload page (F5) | Same user still selected | `ui-flow.md` |
| A5 | Clear selection (choose “Select user…”) | Write actions disabled again | Core #2 |

---

## Section B — Ticket list & search

| Step | Action | Expected | AC refs |
|------|--------|----------|---------|
| B1 | Land on `/` | Table shows seeded tickets (title, status, priority, assignee, date) | Core #7, #12 |
| B2 | Note count footer | “Showing N ticket(s)” matches visible rows | Core #12 |
| B3 | Search `login` | “Login Issue — password reset loop” (or similar) appears; case-insensitive | Core #28–29 |
| B4 | Clear search | All tickets return (subject to filter) | Core #30 |
| B5 | Status filter **Open** | Only OPEN tickets | Core #31 |
| B6 | Search `login` + filter **Open** | Combined filter works | Core #32 |
| B7 | Search `zzzznonexistent` | “No tickets match your search/filter” + Clear filters | Error #84–86 |
| B8 | Search `%` (if seeded ticket has `%` in title) | No server error; sensible results | Error #89 |

---

## Section C — Create ticket

| Step | Action | Expected | AC refs |
|------|--------|----------|---------|
| C1 | Click **New ticket** without acting user | Create disabled or blocked | Core #2 |
| C2 | Select acting user → **New ticket** | Form loads | Core #3 |
| C3 | Submit empty form | Field errors (title, description, priority) | Validation #42–44 |
| C4 | Fill title, description; leave priority “Select priority”; submit | Priority required error | Validation #44 |
| C5 | Create: title `QA Test Ticket`, description `Manual test`, priority **High**, assignee **Unassigned** | Redirects to detail; status **Open** | Core #3–6 |
| C6 | On detail, confirm **Created by** = James Chen | Acting user attribution | Core #4, #48 |

---

## Section D — Status transitions (happy path)

Use the ticket from C5 (or any OPEN ticket).

| Step | Action | Expected | AC refs |
|------|--------|----------|---------|
| D1 | Note status action buttons | Only valid targets shown (e.g. Start progress, Cancel ticket) — **not** Resolved/Closed | Core #24, #18–22 |
| D2 | **Start progress** | Status → In Progress; success message; buttons update | Core #18 |
| D3 | **Mark resolved** | Status → Resolved; only Close (or similar) remains | Core #19 |
| D4 | **Close ticket** | Status → Closed; terminal banner; no action buttons | Core #20, #33 |
| D5 | Confirm no Edit / comment form on CLOSED ticket | Read-only UI | Core #33, Error #81–82 |

**Optional second ticket:** OPEN → Cancelled path (Core #21).

---

## Section E — Edit fields

Use an **OPEN** or **IN_PROGRESS** ticket (not the one you closed).

| Step | Action | Expected | AC refs |
|------|--------|----------|---------|
| E1 | Click **Edit** | Fields become editable | Core #15 |
| E2 | Change title, priority, assignee; **Save** | Updates visible; success banner | Core #15–17 |
| E3 | **Cancel** edit without saving | Reverts to last saved values | `ui-flow.md` |
| E4 | On IN_PROGRESS ticket, clear assignee to Unassigned; save | Allowed | Core #16, #23 |

---

## Section F — Comments

| Step | Action | Expected | AC refs |
|------|--------|----------|---------|
| F1 | On non-terminal ticket, post comment `QA comment at <time>` | Comment appears in list | Core #25–27 |
| F2 | Confirm comment order | Oldest first | Core #14 |
| F3 | Submit empty/whitespace comment | Validation error | Validation #64 |
| F4 | Open **CLOSED** ticket from D4 | Comment form hidden; existing comments still visible if any | Core #35, Error #82 |

---

## Section G — Error handling (UI)

| Step | Action | Expected | AC refs |
|------|--------|----------|---------|
| G1 | Navigate to `/tickets/nonexistent-id-123` | “Ticket not found” + link home | Error #73, Validation #65 |
| G2 | On OPEN ticket, note buttons; only use API-driven actions | No extra transition buttons in DOM | Core #24 |
| G3 | (Optional) Two tabs: transition in tab A, stale transition in tab B | Tab B shows “Status changed — please try again” after refetch | Error #76–77 |

*G3 simulation:* Open same ticket in two tabs → transition in tab 1 → click transition in tab 2 → expect warning, not crash.

---

## Section H — Persistence (restart)

| Step | Action | Expected | AC refs |
|------|--------|----------|---------|
| H1 | Note a ticket ID you created in C5 | — | Testing #100 |
| H2 | Stop backend (`Ctrl+C`), run `npm run dev` again | Server restarts | — |
| H3 | Reload frontend; open same ticket ID | Ticket and comments still present | Testing #100 |
| H4 | `curl http://localhost:3000/api/users` | 5 users returned | Core #1 |

---

## Section I — Automated test confirmation (optional same session)

```bash
cd backend
npm test                  # expect 35/35
npm run test:integration  # expect 17/17
```

| Step | Expected | AC refs |
|------|----------|---------|
| I1 | Unit tests pass | Testing #93–94 |
| I2 | Integration tests pass | Testing #93–99, #101 |

---

## Sign-off checklist

After completing sections A–H, tick applicable items in `acceptance-criteria.md`:

- **Core** — UI-visible items (#1–38)
- **Error Handling** — UI items (#73–89) covered in G and B7–B8
- **Testing** — #93–99 automated via I; #100 via H
- **Documentation** — #105–108 (verify docs match behavior)

---

## Issues found

| Step | Issue | Severity | Logged in |
|------|-------|----------|-----------|
| | | | `debugging-notes.md` |
| | | | |

---

## Quick regression targets (if something breaks)

| Symptom | Check |
|---------|--------|
| 500 on create with assignee | Empty-string `assignedToId` — integration test |
| Wrong search results for `%` | `ticketService.list` literal match |
| 409 instead of 422 on CLOSED ticket | `api-contract.md` check order |
| No status buttons | `allowedStatuses` in API response |
| CORS errors | Use Vite proxy; frontend on :5173 |

See `debugging-notes.md` and `review-fixes.md`.
