# Debugging Notes

Real issues encountered during the Support Ticket Management System build, how they were investigated, and what fixed them.

---

## Issue 1 — Unexpected Prisma scaffolding folders

### Problem

After `npm install prisma` / `npx prisma init`, three folders appeared under `backend/`:

- `backend/.claude/skills`
- `backend/.agents/skills`
- `backend/.windsurf/skills`

They were not requested and not part of any project prompt.

### How I Investigated

- Checked `package.json` for unexpected dependencies (none — only expected Prisma/Express stack).
- Checked `git log` — folders appeared in the same commit as initial backend bootstrap.
- Inspected contents — static reference docs, not executable code.

### How AI Helped

N/A — this was Prisma 7 tooling output, not AI-generated application code.

### What I Validated

Confirmed contents were inert documentation, not a security or dependency risk.

### Final Fix

Removed the three folders and added `.gitignore` rules under `backend/.claude/`, `backend/.agents/`, `backend/.windsurf/` to prevent accidental commits if Prisma recreates them.

---

## Issue 2 — `isTerminal()` dual source of truth

### Problem

`ticketStatusService.ts` used an explicit `ALLOWED_TRANSITIONS` map **and** a separate hardcoded `TERMINAL_STATUSES` Set. Both could drift if transitions changed without updating the Set.

### How I Investigated

Line-by-line review of `ticketStatusService.ts` against the “single source of truth” requirement in `design-notes.md`. `isTerminal()` did not derive from the adjacency map.

### How AI Helped

Follow-up prompt to rewrite `isTerminal()` as `ALLOWED_TRANSITIONS[status].length === 0` and remove `TERMINAL_STATUSES`.

### What I Validated

Ran unit tests (`npm test`) — 35/35 pass. Confirmed `CLOSED` and `CANCELLED` still return `[]` from `getAllowedTransitions`.

### Final Fix

Commit `ac8a286` — `isTerminal` derives from transition map only.

---

## Issue 3 — `updateFields` check order contradicted `api-contract.md`

### Problem

First `ticketService.updateFields` implementation used: exists → terminal → field validation.  
`api-contract.md` requires: field validation → exists → terminal (field syntax errors before 404; terminal before FK).

### How I Investigated

Compared service method order against the committed `api-contract.md` check-order table — not just against the implementation prompt (which had specified the wrong order).

### How AI Helped

Regenerated `updateFields` with guards reordered to match the contract.

### What I Validated

Integration tests for terminal read-only and validation paths; manual trace of overlapping failure conditions.

### Final Fix

Commit `20921ef` — reordered early-return guards in `updateFields`.

---

## Issue 4 — `commentService` skipped `createdById` validation

### Problem

`commentService.create()` docstring claimed `createdById` was validated by a route-layer `ActingUserService`. No such service exists. Invalid `createdById` would hit Prisma and surface as an uncontrolled 500 instead of `400 VALIDATION_ERROR`.

### How I Investigated

Cross-file review: compared `ticketService.create()` (validates user inline) vs `commentService.create()` (did not). Grepped codebase for `ActingUserService` — zero implementations.

### How AI Helped

Extracted shared `assertUserExists()` into `userValidation.ts`; wired both services.

### What I Validated

`actingUser` middleware still handles header; services validate FK existence consistently.

### Final Fix

Commit `66a91a8` — `backend/src/services/userValidation.ts` shared by ticket and comment services.

---

## Issue 5 — Empty-string `assignedToId` bypassed validation

### Problem

`assignedToId: ""` passed Zod (optional string) and failed service truthy checks (`if (assignedToId)`), reaching Prisma with an invalid FK → raw DB error / 500 instead of `400 VALIDATION_ERROR`.

### How I Investigated

Mental execution: Zod parse → service `if (truthy)` → `??` → Prisma. Empty string is defined but falsy, so checks were skipped incorrectly.

### How AI Helped

Added Zod `.refine()` rejecting empty/whitespace strings; changed service checks to `!== null && !== undefined`.

### What I Validated

Integration regression test: `assignedToId: ""` → `400 VALIDATION_ERROR` with field details.

### Final Fix

Commit `d24e52f` + integration test in `tickets.test.ts`.

---

## Issue 6 — Search special characters matched wrong tickets (LIKE escaping)

### Problem

Integration test `treats %, _, and backslash in search as literals` failed: searching `%` returned `path\to\file` instead of `100% done`.

Root cause: Prisma `contains` on SQLite uses `LIKE` without an `ESCAPE` clause. Escaping with `\%` made `\` literal and `%` a wildcard — matching any string containing a backslash.

### How I Investigated

Read failure output (`expected '100% done'`, `received 'path\to\file'`). Traced `ticketService.list` → `escapeLikePattern` → Prisma `contains`.

### How AI Helped

Replaced DB-side `LIKE` filtering with case-insensitive JavaScript `.includes()` after status filter (acceptable for Core SQLite scope).

### What I Validated

Re-ran `npm run test:integration` — all 17 pass, including decoy-ticket LIKE test.

### Final Fix

In-memory literal substring match in `ticketService.list()` (search path only).

---

## Issue 7 — Integration test parse error (backslash in test source)

### Problem

First run of `tickets.test.ts` failed to parse: invalid escape sequence in `.toBe('path\to\file')` — `\t` interpreted as tab.

### How I Investigated

Vitest/TypeScript parse error pointed at line 271.

### How AI Helped

Used `const backslashTitle = "path\\to\\file"` and `.query({ search: "\\" })` for the backslash search case.

### What I Validated

`npm run test:integration` compiles and passes.

### Final Fix

Explicit escaped strings in test file (no `String.raw` in assertion that confused the parser).

---

## Issue 8 — Prisma 7 `migrate reset --skip-seed` unavailable

### Problem

Integration setup initially planned `prisma migrate reset --force --skip-seed`. Prisma 7 removed `--skip-seed`; Cursor sandbox also blocked destructive `migrate reset` without consent.

### How I Investigated

Read Prisma 7 migration docs; ran setup script — flag not recognized.

### How AI Helped

Switched to: delete `test.db` manually → `prisma migrate deploy` → seed two fixed test users in `setup.ts`.

### What I Validated

Integration suite runs cleanly on fresh checkout; test DB never uses `prisma/seed.ts`.

### Final Fix

`backend/tests/integration/setup.ts` wipe + deploy pattern documented in `database/setup-notes.md`.

---

## Issue 9 — `ui-flow.md` contained prompt history instead of UI spec

### Problem

Root `ui-flow.md` held duplicate content from `ai-prompts/design.md` (prompt logs). The actual frontend screen specification was never saved to the correct file — despite a commit message claiming UI flow was added.

### How I Investigated

Opened `ui-flow.md` during frontend work; `git show fc34f68:ui-flow.md` confirmed prompts were committed in place of the spec. `design-notes.md` referenced `ui-flow.md` for frontend detail.

### How AI Helped

Regenerated full `ui-flow.md` from accepted prompt summary + `api-contract.md`. Moved prompt history to `ai-prompts/design.md` only (Prompt 3 renumbered).

### What I Validated

Frontend implementation checked line-by-line against restored `ui-flow.md`.

### Final Fix

Commit `2d58166` — proper UI flow document at repo root.

---

## Issue 10 — Ticket list refetch loop (frontend)

### Problem

During frontend development, `TicketListPage` `loadTickets` included `tickets.length` in `useCallback` deps. Successful fetch updated tickets → callback identity changed → `useEffect` re-ran → potential infinite refetch loop.

### How I Investigated

Code review of `useEffect` / `useCallback` dependency array before first manual UI test.

### How AI Helped

Replaced `tickets.length` dependency with `useRef(hasLoadedOnce)` for refresh vs initial-load distinction.

### What I Validated

`npm run build` passes; list loads once per search/filter change in manual smoke.

### Final Fix

`frontend/src/pages/TicketListPage.tsx` — stable `loadTickets` deps.

---

## Debugging habits that helped

1. **Re-check new code against committed docs** (`api-contract.md`), not only the latest prompt.
2. **Cross-file consistency** — compare sibling services (ticket vs comment create).
3. **Edge-case mental execution** — empty string vs null vs undefined.
4. **Run tests locally** — do not trust AI “should pass” summaries.
5. **Integration tests with decoys** — LIKE-escaping test proved behavior, not just absence of 500.
