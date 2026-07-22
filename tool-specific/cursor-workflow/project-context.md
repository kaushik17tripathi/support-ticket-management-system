# Project Context

Persistent context for Cursor when working on this repository.

## What this is

AI Capability Exercise — **Support Ticket Management System (Core)**. Full-stack ticket tracker with enforced lifecycle, comments, search/filter, no authentication (acting-user dropdown).

## Repository layout

```
backend/     Express + Prisma 7 + SQLite + Zod + Vitest
frontend/    React + Vite + TypeScript
database/    setup-notes, seed-data definitions
ai-prompts/  prompt history by lifecycle phase
```

Root docs are **authoritative** for business logic: `api-contract.md`, `data-model.md`, `ui-flow.md`, `requirements-analysis.md`, `acceptance-criteria.md`.

## Non-negotiable rules

1. **State machine** lives only in `backend/src/services/ticketStatusService.ts`.
2. **UI** renders status actions from API `allowedStatuses` only — never a client-side transition map.
3. **Check order** on mutating endpoints matches `api-contract.md` (terminal before 409 on status change).
4. **Prisma 7** requires `@prisma/adapter-better-sqlite3` — do not remove.
5. **Test DB** (`test.db`) is separate from dev seed (`dev.db`).

## Current status

See `README.md` — backend, frontend, tests, and submission docs complete. Manual QA: `manual-qa-walkthrough.md`.

## Candidate

Kaushik Tripathi — SE — Cursor — assessment Jul 2026.
