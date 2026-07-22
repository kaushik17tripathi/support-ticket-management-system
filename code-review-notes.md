# Code Review Notes

AI-assisted and manual review observations during backend and frontend implementation.

---

## AI-Assisted Review Summary

Review was not a single pass — it happened after **every** implementation prompt:

1. Read generated code against `api-contract.md`, `data-model.md`, and `design-notes.md`.
2. Trace check-order sequences for overlapping failure conditions (terminal vs 409 vs 400).
3. Cross-compare sibling modules (`ticketService` vs `commentService`) for consistent validation.
4. Run `npm test` / `npm run test:integration` and paste real output before accepting.
5. Log Accepted / Changed / Rejected in `ai-prompts/implementation.md`.

Cursor was used for generation; judgment calls (accept, fix, reject) were manual.

---

## Review Observations — Backend

### State machine (`ticketStatusService.ts`)

| Finding | Severity | Action |
|---------|----------|--------|
| `isTerminal` used separate `TERMINAL_STATUSES` Set | Medium (maintainability) | Fixed — derive from empty transition list |
| Adjacency map correct for all 5 valid transitions | OK | Accepted |
| Same-state returns `false` from `canTransition` | OK | Accepted — API layer returns 400 |

### Services (`ticketService.ts`, `commentService.ts`)

| Finding | Severity | Action |
|---------|----------|--------|
| `updateFields` check order wrong vs contract | High | Fixed — validation before 404/terminal |
| `commentService` assumed nonexistent `ActingUserService` | High | Fixed — shared `userValidation.ts` |
| `assignedToId: ""` truthy bypass | High | Fixed — Zod refine + explicit null checks |
| `transitionStatus` atomic `updateMany` with status match | OK | Accepted — real concurrency guard |
| Search `escapeLikePattern` unverified | Medium | Fixed after integration test exposed bug |

### Routes / middleware

| Finding | Severity | Action |
|---------|----------|--------|
| Thin handlers delegating to services | OK | Accepted |
| `errorHandler` maps `AppError` without stack in body | OK | Accepted |
| `actingUser` on mutating routes only | OK | Matches contract |

### Tests

| Finding | Severity | Action |
|---------|----------|--------|
| Unit tests explicit per transition (no loops) | OK | Accepted — diagnosable failures |
| Integration test for terminal-before-409 precedence | OK | Accepted — proves contract |
| Missing persistence/restart automation | Low | Documented gap in `test-strategy.md` |

---

## Review Observations — Frontend

| Finding | Severity | Action |
|---------|----------|--------|
| Status buttons from `allowedStatuses` only | OK | Accepted — no client state machine |
| `transitionActionLabel` is display-only | OK | Accepted — not used to filter transitions |
| `isTerminalStatus` for UI presentation only | OK | Accepted — not transition logic |
| 409 flow: refetch then user retry (no silent retry) | OK | Matches `ui-flow.md` |
| `loadTickets` unstable deps | Medium | Fixed before QA |
| No component/E2E tests | Low | Documented — manual QA |

---

## Review Observations — Documentation

| Finding | Severity | Action |
|---------|----------|--------|
| `ui-flow.md` held prompt logs, not UI spec | High | Restored proper spec |
| `design-notes.md` testing link said “to be populated” | Low | Linked to test docs |
| `.env.example` path `file:./prisma/dev.db` | OK | Matches `prisma.ts` default |

---

## Changes Made After Review

See **`review-fixes.md`** for commit-level mapping. Summary:

- 4 `fix(ai-catch)` commits for issues caught during review (not blind acceptance).
- 1 search implementation fix driven by failing integration test.
- 1 `ui-flow.md` restoration.
- 1 frontend dependency-array fix.

---

## Suggestions Rejected (and why)

| Suggestion | Source | Why rejected |
|------------|--------|--------------|
| Separate `TERMINAL_STATUSES` Set | Initial AI `isTerminal` | Violates single source of truth — derive from map |
| Route-layer-only `createdById` validation for comments | AI docstring assumption | Service layer must enforce FK; no `ActingUserService` exists |
| `updateFields` order: exists → terminal → validate | My own Step 5 prompt | Contradicted committed `api-contract.md` — contract wins |
| Client-side transition map in React | Not proposed, explicitly avoided | Would duplicate backend; `allowedStatuses` is authoritative |
| `prisma migrate reset` in CI/setup | Prisma 7 / sandbox | Use wipe + `migrate deploy` for test DB |
| Adding CORS package for dev | Considered | Vite proxy sufficient for Core |

---

## Review checklist used (repeatable)

- [ ] Does this match `api-contract.md` error codes and check order?
- [ ] Does validation distinguish `""`, `null`, and `undefined`?
- [ ] Is state-machine logic only in `ticketStatusService.ts`?
- [ ] Do integration tests cover the highest-risk precedence cases?
- [ ] Were tests run locally with output captured?
- [ ] Is prompt history updated with Accepted/Changed/Rejected?

---

## Related artifacts

- `debugging-notes.md` — investigation detail per issue
- `review-fixes.md` — commit ↔ fix mapping
- `ai-prompts/implementation.md` — full prompt/response log
- `test-strategy.md` / `test-results.md` — verification evidence
