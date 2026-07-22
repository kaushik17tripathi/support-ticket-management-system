# Review Fixes

Mapping of issues caught during code review to commits and files changed. All fixes were applied **after** reviewing AI-generated output — not pre-emptive.

---

## Summary

| Commit | Issue | Files |
|--------|-------|-------|
| `ac8a286` | `isTerminal` dual source of truth | `backend/src/services/ticketStatusService.ts` |
| `20921ef` | `updateFields` check order vs `api-contract.md` | `backend/src/services/ticketService.ts` |
| `66a91a8` | Missing `createdById` validation in comments | `backend/src/services/userValidation.ts`, `commentService.ts`, `ticketService.ts` |
| `d24e52f` | Empty-string `assignedToId` bypass | `backend/src/validation/ticketValidation.ts`, `ticketService.ts` |
| (in integration PR) | Search LIKE wildcard bug | `backend/src/services/ticketService.ts` |
| `2d58166` | `ui-flow.md` wrong content | `ui-flow.md`, `ai-prompts/design.md` |
| (frontend) | List page refetch loop | `frontend/src/pages/TicketListPage.tsx` |

---

## Fix 1 — `isTerminal` derivation (`ac8a286`)

**Caught:** Review of `ticketStatusService.ts` — `TERMINAL_STATUSES` Set parallel to `ALLOWED_TRANSITIONS`.

**Change:**

```typescript
// Before: isTerminal checked TERMINAL_STATUSES.has(status)
// After:  isTerminal checks ALLOWED_TRANSITIONS[status].length === 0
```

**Verification:** `npm test` — 35/35 pass.

---

## Fix 2 — `updateFields` guard order (`20921ef`)

**Caught:** Service order did not match committed `api-contract.md` § PATCH `/tickets/:id` check order.

**Change:** Moved `validateUpdateFieldsInput()` before `findTicketOrThrow()` and terminal check.

**Why correct:** Invalid body fields return `400` before `404`; terminal returns `422` before assignee FK check — per contract.

**Verification:** Integration terminal + validation tests pass.

---

## Fix 3 — Shared user validation (`66a91a8`)

**Caught:** `commentService` docstring referenced nonexistent `ActingUserService`; `ticketService.create` already validated inline.

**Change:** Extracted `assertUserExists(userId, field)` in `userValidation.ts`; used in both services.

**Why correct:** Invalid user IDs return `400 VALIDATION_ERROR` at application layer, not Prisma FK errors.

**Verification:** Manual trace + `INVALID_ACTING_USER` integration test.

---

## Fix 4 — Empty-string `assignedToId` (`d24e52f`)

**Caught:** Truthy check `if (assignedToId)` let `""` through to Prisma.

**Change:**

- Zod `assignedToIdSchema` — `.refine` rejects `""` and whitespace-only strings.
- Service — `assignedToId !== null && assignedToId !== undefined` before FK lookup.

**Verification:** Integration test `assignedToId is an empty string on create` → `400`.

---

## Fix 5 — Search literal matching (integration-test-driven)

**Caught:** `treats %, _, and backslash in search as literals` failed — `%` query matched `path\to\file`.

**Change:** Replaced Prisma `contains` + `escapeLikePattern` with in-memory case-insensitive `.includes()` after DB status filter.

**Why correct:** SQLite `LIKE` without `ESCAPE` treats `\%` as literal `\` + wildcard `%`. Core dataset is small; literal semantics required by `api-contract.md`.

**Verification:** `npm run test:integration` — 17/17 pass.

---

## Fix 6 — Restore `ui-flow.md` (`2d58166`)

**Caught:** Root doc contained prompt history; frontend had no authoritative screen spec.

**Change:** Wrote full UI flow (acting user, list, create, detail, terminal, errors). Renumbered Prompt 3 in `ai-prompts/design.md`.

**Verification:** Frontend built against restored doc.

---

## Fix 7 — Ticket list refetch loop (frontend)

**Caught:** `loadTickets` depended on `tickets.length` → unstable callback → repeated `useEffect`.

**Change:** `useRef(hasLoadedOnce)` for refresh state; deps only `[debouncedSearch, statusFilter]`.

**Verification:** `npm run build`; manual list smoke — single fetch per filter change.

---

## Regression tests added with fixes

| Fix | Regression test |
|-----|-----------------|
| Empty-string `assignedToId` | `returns 400 VALIDATION_ERROR when assignedToId is an empty string on create` |
| Check-order terminal vs 409 | `returns 422 TERMINAL_TICKET_READ_ONLY (not 409) when changing status on CLOSED...` |
| Search literals | `treats %, _, and backslash in search as literals (LIKE escaping)` |

---

## Items logged but not code-fixed (by design)

| Item | Resolution |
|------|------------|
| Prisma `.claude` / `.agents` / `.windsurf` folders | Deleted + gitignored |
| No persistence integration test | Documented manual smoke in `test-results.md` |
| No frontend E2E | Manual QA checklist in `test-results.md` |

---

## How to find the original mistakes

- Prompt history: `ai-prompts/implementation.md` (Prompts 3, 5, 6, 7, 10)
- Debugging detail: `debugging-notes.md`
- Git: `git log --grep="fix(ai-catch)"`
