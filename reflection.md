# Reflection

## What I Built

A Support Ticket Management System covering the full Core scope: REST API with an enforced ticket lifecycle, SQLite persistence via Prisma, keyword search and status filtering, comment threads, structured error handling, and a React frontend that drives status controls exclusively from API `allowedStatuses`.

The hardest part — by design — was the **state machine**: five valid transitions, explicit rejection of skip-ahead and terminal outbound moves, optimistic concurrency on status changes, and terminal-ticket read-only rules applied consistently across field updates, transitions, and comments. I treated `api-contract.md` check-order tables as executable specs and backed them with integration tests (e.g. CLOSED + stale `expectedStatus` must return `422`, never `409`).

---

## How I Used AI (Across the Lifecycle)

| Phase | How Cursor was used | My role |
|-------|---------------------|---------|
| **Requirements** | Challenged assumptions, enumerated edge cases, drafted acceptance criteria | Resolved contradictions (terminal read-only scope); rejected vague defaults |
| **Design** | Generated data model, API contract, UI flow, design synthesis | Fixed check-order ambiguity; verified enums vs plain strings |
| **Implementation** | Scaffolded services, routes, tests, frontend pages | Reviewed every diff against committed docs; 4 explicit fix commits |
| **Testing** | Generated test matrices and integration suite | Ran tests locally; demanded decoy-ticket LIKE test, not just “no 500” |
| **Debugging** | Proposed fixes for search, parse errors, refetch loops | Traced empty-string and check-order bugs myself first |
| **Code review** | N/A for blind acceptance | Cross-file consistency checks (ticket vs comment services) |
| **Documentation** | Drafted README, setup notes, test strategy | Verified setup on clean DB; pasted real terminal output |

Full prompt log: `ai-prompts/` with Accepted / Changed / Rejected on each cycle.

---

## What AI Helped With Most

1. **Boilerplate velocity** — Express route wiring, Zod schemas, Vitest/Supertest structure, Vite scaffold. Saved hours without sacrificing review time.
2. **Exhaustive test enumeration** — Generating explicit per-transition unit tests and integration scenarios from `acceptance-criteria.md`.
3. **Documentation drafts** — API contract, UI flow, setup notes as starting points I then validated.
4. **Check-order reasoning** — Surfacing overlapping failure conditions (terminal vs 409 vs 400) once I asked for explicit precedence.

---

## What AI Got Wrong

| Mistake | Impact | How I caught it |
|---------|--------|-----------------|
| `isTerminal` used separate `TERMINAL_STATUSES` Set | Latent drift risk | Line-by-line review vs “single source of truth” |
| `updateFields` wrong guard order | Contradicted `api-contract.md` | Re-read contract, not just implementation prompt |
| `commentService` assumed `ActingUserService` | Invalid FK → 500 | Cross-file grep — service didn't exist |
| `assignedToId: ""` truthy bypass | 500 instead of 400 | Mental execution + integration regression test |
| Search `escapeLikePattern` on SQLite | Wrong matches for `%` | Failing integration test with decoys |
| `ui-flow.md` saved as prompt log | Missing frontend spec | Opened file during frontend work |
| Integration test backslash string | Parse error | Vitest compile failure |

These are logged in `debugging-notes.md` and `review-fixes.md` with commit references.

---

## How I Validated AI Output

1. **Committed docs as source of truth** — New code checked against `api-contract.md` / `data-model.md`, not only the latest prompt.
2. **Run tests, paste output** — `test-results.md` contains real `npm test` / `npm run test:integration` output (23 Jul 2026).
3. **Setup reproduction** — Deleted `dev.db`, followed `README.md` from scratch.
4. **Reject silently wrong patterns** — No client-side state machine; no duplicate terminal status sets.
5. **Regression tests for every fix** — Empty string, terminal-before-409, LIKE literals.

I did **not** accept Cursor’s “tests should pass” narration without running them myself.

---

## What I Would Improve Next

1. **Automated persistence test** — Create ticket, restart DB connection, assert data survives (listed in `test-strategy.md` gap).
2. **Frontend E2E** — Playwright for acting-user persistence, terminal read-only UI, 409 retry flow.
3. **Earlier `ui-flow.md` verification** — Commit message said UI flow was added; content was prompt history. Would diff doc purpose vs filename before moving on.
4. **CI pipeline** — Run unit + integration + `npm run build` on every push.
5. **OpenAPI spec** — Generated from routes or maintained alongside `api-contract.md`.

---

## Reusable Workflow

Artifacts I would reuse on a real project:

| Artifact | Reuse |
|----------|-------|
| `api-contract.md` with check-order tables | Prevents ambiguous 409 vs 422 behavior |
| `ai-prompts/*.md` with Accepted/Changed/Rejected | Audit trail for reviewers |
| Integration tests with **decoy data** | Proves search/security behavior, not just happy path |
| `fix(ai-catch)` commit convention | Makes review catches visible in git history |
| `createApp()` factory for Supertest | Same app instance as production, no `listen()` in tests |
| Spec-before-code prompt sequence | requirements → contract → model → implement |

**Cursor rules I'd keep:** Always cite `api-contract.md` check order in service prompts; never compute transitions client-side; run tests before claiming done.

---

## Honest self-assessment

**Strengths demonstrated:** Spec discipline, catching subtle validation bugs (empty string), test-driven proof of check-order precedence, full prompt history.

**Still manual:** UI QA sign-off, persistence restart test, `tool-workflow.md` (Part A artifact — separate from this reflection).

The project is assessment-ready for Core; Stretch items (E2E, CI, OpenAPI) remain optional evidence.
