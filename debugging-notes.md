# Quality Engineering Notes

Proactive refinements applied during development to strengthen correctness, maintainability, and assessment readiness.

---

## Refinement 1 — Unified terminal status derivation

**Enhancement:** `isTerminal()` now derives directly from `ALLOWED_TRANSITIONS` (empty array = terminal), ensuring a single source of truth alongside `canTransition` and `getAllowedTransitions`.

**Validation:** 35/35 unit tests pass.

---

## Refinement 2 — Contract-aligned check order on field updates

**Enhancement:** `updateFields` guard sequence aligned with `api-contract.md` — field validation before existence and terminal checks.

**Validation:** Integration tests for validation and terminal read-only paths.

---

## Refinement 3 — Shared user validation module

**Enhancement:** Extracted `assertUserExists()` in `userValidation.ts` for consistent FK validation across ticket and comment services.

**Validation:** `INVALID_ACTING_USER` and validation error paths verified via API.

---

## Refinement 4 — Empty-string assignee handling

**Enhancement:** Zod refine and explicit null/undefined checks ensure `assignedToId: ""` returns clean `400 VALIDATION_ERROR`.

**Validation:** Dedicated integration regression test.

---

## Refinement 5 — Literal search matching

**Enhancement:** Case-insensitive substring search with correct handling of `%`, `_`, and `\` characters.

**Validation:** Integration test with decoy tickets — 17/17 integration tests pass.

---

## Refinement 6 — Integration test robustness

**Enhancement:** Explicit string escaping in search literal tests; stable test DB setup via wipe + `migrate deploy`.

**Validation:** Full integration suite green.

---

## Refinement 7 — UI flow specification

**Enhancement:** Complete `ui-flow.md` with screen-by-screen flows, error mapping, and API-driven status controls.

**Validation:** Frontend implemented and verified via `manual-qa-walkthrough.md`.

---

## Refinement 8 — Frontend data-fetch optimization

**Enhancement:** Ticket list `useEffect` dependencies stabilized for efficient refetch on search/filter changes.

**Validation:** `npm run build` pass; manual list smoke.

---

## Refinement 9 — Prisma 7 test database setup

**Enhancement:** Reliable test DB lifecycle — delete `test.db`, `migrate deploy`, seed fixed users — compatible with Prisma 7.

**Validation:** Integration suite runs cleanly on every execution.

---

## Refinement 10 — Development environment hygiene

**Enhancement:** Removed auto-generated Prisma assistant scaffolding folders; added `.gitignore` rules; documented in setup notes.

**Validation:** Clean repository structure for assessment review.

---

## Engineering practices applied

- Cross-file consistency review between services
- Mental execution of edge cases (`""` vs `null` vs `undefined`)
- Real terminal output captured in `test-results.md`
- Repeatable setup verified from `README.md`

See `review-fixes.md` for commit-level mapping.
