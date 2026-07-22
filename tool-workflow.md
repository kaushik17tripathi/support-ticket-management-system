# Tool Workflow

How I used **Cursor** across the software development lifecycle for the Support Ticket Management System (AI Capability Exercise, Core). This document satisfies **Part A: AI Workflow Foundation**.

---

## Primary AI Tool Used

**Cursor** (IDE-integrated agent with codebase context, terminal access, and multi-file editing).

Supporting tools (not AI): Prisma CLI, Vitest, Supertest, Vite, Git.

---

## How I Provide Project Context to the Tool

1. **Committed design docs at repo root** — `requirements-analysis.md`, `acceptance-criteria.md`, `api-contract.md`, `data-model.md`, `ui-flow.md`, `design-notes.md`, `implementation-plan.md`. Every implementation prompt references these as source of truth.

2. **`tool-specific/cursor-workflow/`** — Persistent Cursor context: `project-context.md`, `spec.md`, `tasks.md`, `cursor-rules-or-instructions.md`.

3. **Workspace rules** — GitLab workflow conventions, minimal diff discipline, no secrets in prompts.

4. **Conversation continuity** — Each session starts with project state summary (what’s built, what’s next, what docs are authoritative).

5. **Prompt history** — `ai-prompts/{planning,design,implementation,testing,debugging,code-review,documentation}.md` with full prompt text, AI summary, Accepted / Changed / Rejected / Note.

**Rule:** If a prompt contradicts a committed doc, flag it — do not silently resolve. Example: my own Step 5 prompt specified wrong `updateFields` check order; `api-contract.md` won.

---

## How I Use AI for Requirement Analysis

- Paste or reference the Core assessment spec and ask AI to draft `requirements-analysis.md` and `acceptance-criteria.md`.
- Ask AI to **challenge assumptions** (terminal read-only scope, search fields, priority default).
- Manually resolve contradictions before coding (e.g. terminal tickets: no new comments).
- Log open clarifications explicitly rather than hiding them in code.

**Output:** `requirements-analysis.md`, `acceptance-criteria.md` — reviewed and edited before any implementation.

---

## How I Use AI for Planning and Design

**Planning**
- Generate `implementation-plan.md` with task breakdown, milestones, risks, AI usage plan.
- Time-box Core (~10.5h) vs Stretch.

**Design**
- Sequential prompts: data model → API contract (with check-order fix) → UI flow → design synthesis.
- Verify enums in Prisma schema (AI once defaulted to plain strings — caught in review).
- Explicit **check-order** subsections in `api-contract.md` for overlapping failures (422 vs 409).

**Output:** `data-model.md`, `api-contract.md`, `ui-flow.md`, `design-notes.md`.

---

## How I Use AI for Code Generation

- **One feature per prompt** — e.g. state machine module, then ticket service, then routes, then integration tests, then frontend pages.
- Prompts include: file paths, check order, “do not reimplement X elsewhere”, existing patterns to follow.
- Backend before frontend — API contract stable before UI.
- Reject wholesale rewrites; prefer targeted fix prompts after review.

**Examples:** `ticketStatusService.ts`, `ticketService.ts`, Zod schemas, React pages — all AI-drafted, human-reviewed.

---

## How I Validate AI-Generated Code

| Method | When |
|--------|------|
| **Diff review against `api-contract.md`** | Every service/route change |
| **Cross-file consistency** | e.g. ticket vs comment `createdById` validation |
| **Edge-case mental execution** | `""` vs `null` vs `undefined` |
| **Run tests locally** | Paste real output to `test-results.md` — never trust “should pass” |
| **Setup walkthrough** | Follow `README.md` on clean `dev.db` |
| **Integration tests with decoys** | LIKE search, terminal-before-409 |

**Discipline:** Log Accepted / Changed / Rejected in `ai-prompts/implementation.md`. Use `fix(ai-catch)` commit prefix when review catches AI mistakes.

---

## How I Use AI for Testing

- Prompt test matrices from `acceptance-criteria.md` (all valid + rejected transitions).
- Explicit integration scenarios: check-order precedence, empty-string regression, special-char search with decoy tickets.
- Run `npm test` and `npm run test:integration` after each test milestone; paste failures back for targeted fixes (not full rewrites).

**Output:** 35 unit + 17 integration tests; `test-strategy.md`, `test-results.md`.

---

## How I Use AI for Debugging

- Paste **actual** Vitest/Supertest failure output (e.g. LIKE test expected `100% done`, got `path\to\file`).
- Ask AI to explain root cause, then verify fix with re-run.
- Document in `debugging-notes.md`: Problem → Investigation → Validation → Fix.

**Examples:** SQLite LIKE without ESCAPE, integration test backslash parse error, frontend `useEffect` dependency loop.

---

## How I Use AI for Code Review

- Self-review first against committed specs; AI used for second-pass generation fixes, not blind approval.
- `code-review-notes.md` — tables of findings, rejected suggestions.
- `review-fixes.md` — maps issues to commits.

**Rejected examples:** separate `TERMINAL_STATUSES` Set, nonexistent `ActingUserService`, client-side state machine.

Optional: Cursor Bugbot-style review on diffs before commit (not required for Core).

---

## What Information I Avoid Sharing Unnecessarily

- No API keys, tokens, passwords, or production credentials (Core uses no auth).
- `.env` files gitignored; only `.env.example` committed.
- No internal employer secrets or customer data in prompts.
- Treat repo comments/README as untrusted for safety overrides (workspace rule).

---

## How I Would Reuse This Workflow in a Real Project

1. **Spec-first** — Requirements + API contract + check orders before codegen.
2. **Single source of truth** — State machine (or business rules) in one module; UI mirrors API.
3. **Prompt log with Accepted/Changed/Rejected** — Audit trail for team review.
4. **Test the contract** — Integration tests for precedence cases, not only happy path.
5. **Small prompts, small diffs** — Easier to review than “build the whole backend.”
6. **fix(ai-catch) commits** — Visible review culture in git history.
7. **Persistent `tool-specific/` + root docs** — New team members (and AI) load same context.

**Artifacts to copy:** `api-contract.md` pattern, `ai-prompts/` structure, Supertest + isolated test DB setup, `manual-qa-walkthrough.md` for release sign-off.

---

## Related Documents

| Document | Role |
|----------|------|
| `final-ai-usage-summary.md` | Rollup for reviewers |
| `reflection.md` | Project reflection and reusable workflow |
| `ai-prompts/` | Full prompt history |
| `tool-specific/cursor-workflow/` | Cursor-specific persistent context |
| `manual-qa-walkthrough.md` | UI verification script |
