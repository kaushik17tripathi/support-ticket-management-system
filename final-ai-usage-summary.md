# Final AI Usage Summary

Consolidated view of how **Cursor** was used across the Support Ticket Management System assessment. Detail lives in `ai-prompts/`; this is the rollup for reviewers.

---

## Tool and context

| Item | Value |
|------|-------|
| **Primary AI tool** | Cursor |
| **Project** | Support Ticket Management System (Core) |
| **Stack** | React/Vite/TS + Express/Prisma 7/SQLite |
| **Assessment period** | 20–23 Jul 2026 |
| **Persistent context** | Root design docs, `tool-specific/cursor-workflow/`, workspace rules |

---

## Lifecycle coverage

| Phase | Prompts logged | Key outputs | Review outcome |
|-------|----------------|-------------|----------------|
| **Planning** | `ai-prompts/planning.md` | `requirements-analysis.md`, `acceptance-criteria.md`, `implementation-plan.md` | Assumptions resolved before code |
| **Design** | `ai-prompts/design.md` | `data-model.md`, `api-contract.md`, `ui-flow.md`, `design-notes.md` | Check-order ambiguity fixed in contract |
| **Implementation** | `ai-prompts/implementation.md` (13 prompts) | Backend services, routes, tests, seed, frontend | 4 `fix(ai-catch)` commits |
| **Testing** | `ai-prompts/testing.md` | `test-strategy.md`, `test-results.md`, 52 automated tests | Real terminal output captured |
| **Debugging** | `ai-prompts/debugging.md` | `debugging-notes.md` (10 issues) | Each tied to investigation + fix |
| **Code review** | `ai-prompts/code-review.md` | `code-review-notes.md`, `review-fixes.md` | Rejected suggestions documented |
| **Documentation** | `ai-prompts/documentation.md` | `README.md`, `database/setup-notes.md`, final artifacts | Setup verified on clean DB |

---

## Context-setting practices

What worked:

1. **Authoritative docs first** — Implemented against committed `api-contract.md`, not ad-hoc prompts.
2. **Explicit check-order in prompts** — Service generation prompts included numbered guard sequences.
3. **Accepted / Changed / Rejected logging** — Every implementation cycle recorded in `ai-prompts/implementation.md`.
4. **Cross-file review prompts** — “Match how `ticketService.create` handles `createdById`” caught comment service gap.
5. **Test prompts with decoys** — LIKE-escaping test specified decoy tickets to prove literal match.

What I avoided sharing unnecessarily:

- No production secrets (none used; `.env` gitignored).
- No personal credentials in prompts.

---

## Code generation: accept vs fix vs reject

### Accepted as-is (examples)
- Prisma schema and enum modeling
- `AppError` taxonomy matching contract
- Unit test structure (explicit per-transition, no loops)
- Vite + React Router scaffold
- Idempotent seed upsert strategy

### Changed after review
| Issue | Fix commit / location |
|-------|----------------------|
| `isTerminal` dual source | `ac8a286` |
| `updateFields` check order | `20921ef` |
| Comment `createdById` validation | `66a91a8` |
| Empty-string `assignedToId` | `d24e52f` |
| Search literal semantics | `ticketService.list` |
| `ui-flow.md` content | `2d58166` |
| Frontend list refetch deps | `TicketListPage.tsx` |

### Rejected
- Standalone `TERMINAL_STATUSES` Set
- Nonexistent `ActingUserService` validation story
- Wrong `updateFields` order from my own prompt (contract overruled prompt)
- Client-side state machine in UI
- `prisma migrate reset --skip-seed` (Prisma 7 removed flag)

---

## Validation discipline

| Method | Evidence |
|--------|----------|
| Unit tests | 35/35 — `test-results.md` |
| Integration tests | 17/17 — includes terminal-before-409, empty string, LIKE decoys |
| Frontend build | `npm run build` pass |
| Setup walkthrough | Fresh `dev.db` migrate + seed |
| Git traceability | `fix(ai-catch)` prefix on review catches |

**Rule followed:** Never mark tests passing without local run output.

---

## AI value vs human judgment

| AI strong at | Human judgment required |
|--------------|-------------------------|
| Scaffolding, CRUD, test boilerplate | Check-order precedence vs contract |
| Drafting long markdown specs | Resolving requirement contradictions |
| Enumerating transition matrices | Empty string / null / undefined edges |
| Generating Zod schemas | Cross-service validation consistency |
| First-pass route wiring | Whether SQLite LIKE escaping actually works |

**Biggest ROI:** Using AI for volume (tests, docs, routes) while spending review time on **contract alignment** and **edge cases** — where all four `fix(ai-catch)` bugs lived.

---

## Traceability map

```
requirements-analysis.md
        ↓
acceptance-criteria.md + api-contract.md + data-model.md + ui-flow.md
        ↓
design-notes.md (synthesis)
        ↓
backend/src/services/* + routes + frontend/src/*
        ↓
tests/ (unit + integration) → test-strategy.md → test-results.md
        ↓
debugging-notes.md + review-fixes.md
        ↓
reflection.md + pr-description.md (this summary)
```

Commits: `git log --oneline` (planning docs → backend → fixes → tests → seed → frontend → test/docs artifacts).

---

## Gaps and honesty

Not AI-generated or not yet complete:

- `tool-workflow.md` (Part A — separate workflow essay)
- Manual UI QA checkbox sign-off in `acceptance-criteria.md`
- Persistence-restart automated test
- Frontend E2E suite
- CI/CD pipeline

---

## Reusable prompts and rules (for next project)

1. *“Implement check order exactly per api-contract.md; list numbered early-return guards.”*
2. *“Do not reimplement state machine client-side; use allowedStatuses from API only.”*
3. *“One explicit test() per transition — no table-driven loops.”*
4. *“Integration test: decoy records proving search literals, not just no 500.”*
5. *“Log Accepted / Changed / Rejected after every generation.”*

See also: `tool-specific/cursor-workflow/cursor-rules-or-instructions.md`

---

## One-paragraph summary for reviewers

I used Cursor spec-first across planning, design, implementation, testing, and documentation — with `api-contract.md` as the executable source of truth. AI accelerated scaffolding and test enumeration; I caught four substantive backend bugs and several doc/test issues through manual review against committed specs, cross-file consistency checks, and integration tests with decoy data. Full prompt history is in `ai-prompts/`; fixes are traceable via `fix(ai-catch)` commits and `review-fixes.md`. The result is a working Core full-stack app with 52 passing backend tests and honest documentation of gaps (no E2E, no persistence automation yet).
