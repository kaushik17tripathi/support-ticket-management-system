# Cursor Rules and Instructions

Rules applied when using Cursor on this project (also in workspace rules).

## Before coding

1. Read `api-contract.md`, `data-model.md`, and `ui-flow.md` for any business-logic change.
2. Flag contradictions between docs and prompts — do not silently resolve.
3. Prefer smallest diff that solves the request.

## Implementation

- State machine logic **only** in `ticketStatusService.ts`.
- Services throw `AppError` with codes from `api-contract.md`.
- Mutating routes use `actingUser` middleware + Zod validation.
- `assignedToId`: reject `""`; distinguish `null` vs `undefined`.
- Frontend: status buttons from `allowedStatuses` only.

## Testing

- Run `npm test` and `npm run test:integration` after backend changes.
- Run `npm run build` after frontend changes.
- Paste real terminal output into `test-results.md` when updating.

## Commits

- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`
- Use `fix(ai-catch):` when review catches AI-generated mistakes

## Prompt logging

After each significant prompt cycle, append to `ai-prompts/{phase}.md`:

- Prompt (full text)
- AI Response Summary
- Accepted / Changed / Rejected / Note

## Do not

- Remove Prisma 7 SQLite adapter
- Commit `.env` or `*.db` files
- Implement client-side state machine in React
- Push to main without review
- Assume tests pass without running them

## References

- [tool-workflow.md](../../tool-workflow.md)
- [final-ai-usage-summary.md](../../final-ai-usage-summary.md)
- [manual-qa-walkthrough.md](../../manual-qa-walkthrough.md)
