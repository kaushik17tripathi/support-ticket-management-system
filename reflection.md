# Reflection

## What I Built

A complete Support Ticket Management System spanning **Core and Stretch**: REST API with enforced ticket lifecycle, SQLite persistence via Prisma, keyword search and status filtering, comment threads, structured error handling, React frontend driven by API `allowedStatuses`, comprehensive automated tests (52 passing), manual QA walkthrough, and full assessment documentation.

The signature engineering piece is the **state machine** — five valid transitions, exhaustive rejection of invalid paths, optimistic concurrency, and terminal-ticket read-only rules applied consistently. `api-contract.md` check-order tables were treated as executable specs and verified with integration tests.

---

## How I Used AI (Across the Lifecycle)

| Phase | How Cursor was used | Outcome |
|-------|---------------------|---------|
| **Requirements** | Drafted and refined requirements and acceptance criteria | Resolved assumptions before coding |
| **Design** | Generated data model, API contract, UI flow, design synthesis | Check-order precedence documented |
| **Implementation** | Scaffolded services, routes, tests, frontend | Reviewed against committed specs |
| **Testing** | Test matrices, integration suite with decoy scenarios | 52/52 automated tests passing |
| **Debugging** | Targeted refinements from test output | Documented in `debugging-notes.md` |
| **Code review** | Cross-file consistency validation | `code-review-notes.md`, `review-fixes.md` |
| **Documentation** | README, setup notes, submission artifacts | Verified on clean checkout |

Full prompt log: `ai-prompts/` with Accepted / Changed / Rejected on each cycle.

---

## What AI Helped With Most

1. **Boilerplate velocity** — Express routes, Zod schemas, Vitest/Supertest, Vite scaffold
2. **Exhaustive test enumeration** — Per-transition unit tests and integration scenarios
3. **Documentation drafts** — API contract, UI flow, setup notes as strong starting points
4. **Check-order reasoning** — Explicit precedence for overlapping failure conditions

---

## How I Validated AI Output

1. **Committed docs as source of truth** — `api-contract.md`, `data-model.md`, `ui-flow.md`
2. **Run tests, capture output** — `test-results.md` with real terminal results
3. **Setup reproduction** — Fresh `dev.db` from `README.md` instructions
4. **Integration tests with decoy data** — Search literals, terminal-before-409 precedence
5. **Manual QA walkthrough** — `manual-qa-walkthrough.md` sections A–I
6. **Iterative refinement** — Enhanced implementations through review cycles documented in `review-fixes.md`

---

## Engineering Highlights

Through disciplined review, the codebase achieved:

- **Single source of truth** for transitions in `ticketStatusService.ts`
- **Consistent validation** via shared `userValidation.ts` and Zod schemas
- **Contract-aligned check orders** on every mutating endpoint
- **Robust search** with literal character matching
- **API-driven UI** — status controls exclusively from `allowedStatuses`

Details: `review-fixes.md`, `debugging-notes.md`

---

## Reusable Workflow

| Artifact | Value |
|----------|-------|
| `api-contract.md` with check-order tables | Deterministic error precedence |
| `ai-prompts/*.md` | Full audit trail |
| Integration tests with decoy data | Proves edge-case behavior |
| `createApp()` Supertest factory | Production-parity API tests |
| Spec-before-code prompt sequence | requirements → contract → implement |
| `manual-qa-walkthrough.md` | Repeatable UI sign-off |

**Cursor rules:** Cite `api-contract.md` in service prompts; never compute transitions client-side; run tests before claiming complete.

---

## Project outcome

The submission delivers a working full-stack application with complete documentation, automated test coverage, manual QA verification, and transparent AI workflow artifacts — ready for assessment review.
