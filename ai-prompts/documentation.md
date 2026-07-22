# Documentation Prompts

## Prompt 1 — README and database setup notes

**Prompt:**

Continue with item 2: database/setup-notes.md and README.md — real setup instructions,
verified by actually following them on a clean checkout.

**AI Response Summary:** Wrote `database/setup-notes.md` (dev vs test DB, migrate/seed
steps, env vars, troubleshooting) and root `README.md` (quick start, API overview,
scripts, acting-user pattern, doc index). Added `backend/.env.example`. Verified on
fresh dev.db: migrate + seed → health OK, 5 users returned from GET /api/users.

**Accepted:** Full setup docs, `.env.example`, and verified backend + frontend quick start.

**Changed:** Used `file:./prisma/dev.db` in `.env.example` (matches code default).

**Rejected:** N/A

**Note:** Verified setup steps manually after deleting `dev.db` and copying `.env.example`.

---

## Prompt 2 — Final submission artifacts

**Prompt:**

Continue with pr-description.md, reflection.md, and final-ai-usage-summary.md (written last).

**AI Response Summary:** Wrote PR description (features, technical changes, testing, demo
flow), reflection (AI workflow, validation discipline, reusable patterns),
and final AI usage rollup (lifecycle table, traceability, reviewer summary).
Updated README doc index and status.

**Accepted:** All three artifacts aligned to commits, test counts, and `ai-prompts/` log.

**Changed:** N/A

**Rejected:** N/A

**Note:** Submission artifacts present Core and Stretch as fully delivered.

---

## Prompt 3 — Tool workflow and manual QA walkthrough

**Prompt:**

Yes — help with tool-workflow.md (Part A) and structured manual QA walkthrough.

**AI Response Summary:** Wrote `tool-workflow.md` (all Part A sections: context, requirements
through reuse), `manual-qa-walkthrough.md` (sections A–I with acceptance-criteria refs),
and populated `tool-specific/cursor-workflow/` stubs (project-context, spec, tasks,
cursor-rules, acceptance-criteria pointer).

**Accepted:** Full Part A workflow doc and actionable QA script with sign-off table.

**Changed:** N/A

**Rejected:** N/A

**Note:** QA walkthrough references real seeded data (e.g. Login Issue search) and optional
409 two-tab simulation for concurrency UI behavior.
