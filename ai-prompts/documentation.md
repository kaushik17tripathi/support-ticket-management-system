# Documentation Prompts

## Prompt 1 — README and database setup notes

**Prompt:**

Continue with item 2: database/setup-notes.md and README.md — real setup instructions,
verified by actually following them on a clean checkout.

**AI Response Summary:** Wrote `database/setup-notes.md` (dev vs test DB, migrate/seed
steps, env vars, troubleshooting) and root `README.md` (quick start, API overview,
scripts, acting-user pattern, doc index). Added `backend/.env.example`. Verified on
fresh dev.db: migrate + seed → health OK, 5 users returned from GET /api/users.

**Accepted:** Full setup docs, .env.example, frontend marked as in-progress (not built yet).

**Changed:** Used `file:./prisma/dev.db` in .env.example (matches code default, not the
older `file:./dev.db` from early scaffold prompt).

**Rejected:** N/A

**Note:** Verified setup steps manually after deleting dev.db and copying .env.example.

---

## Prompt 2 — Final submission artifacts

**Prompt:**

Continue with pr-description.md, reflection.md, and final-ai-usage-summary.md (written last).

**AI Response Summary:** Wrote PR description (features, technical changes, testing, demo
flow, limitations), reflection (AI help/harm, validation discipline, reusable workflow),
and final AI usage rollup (lifecycle table, accept/fix/reject map, traceability, reviewer
summary). Updated README doc index and status.

**Accepted:** All three artifacts aligned to actual commits, test counts, and ai-prompts log.

**Changed:** N/A

**Rejected:** N/A

**Note:** Honest about remaining gaps (manual QA, tool-workflow.md Part A, no E2E/persistence automation).
