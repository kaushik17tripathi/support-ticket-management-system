# Code Review Notes

## AI-Assisted Review Summary

Structured review after every implementation cycle: diff compared against `api-contract.md`, `acceptance-criteria.md`, and `design-notes.md`. Outcomes logged in `ai-prompts/implementation.md` (Accepted / Changed / Rejected).

---

## Review Standards Applied

| Standard | Result |
|----------|--------|
| State machine single source of truth | `ticketStatusService.ts` only |
| Check-order precedence | Matches `api-contract.md` on all mutating endpoints |
| UI mirrors `allowedStatuses` | No client-side transition map |
| Typed errors (`AppError`) | Full `api-contract.md` taxonomy |
| Validation consistency | Shared `userValidation.ts` + Zod |
| Test explicitness | One test per transition; decoy search tests |

---

## Backend review outcomes

| Area | Assessment |
|------|------------|
| `ticketStatusService.ts` | Complete transition matrix; `isTerminal` derived from map |
| `ticketService.ts` | Contract-aligned guards; atomic status updates |
| `commentService.ts` | Consistent validation with ticket service |
| Routes / middleware | Thin handlers; `actingUser` on mutating routes |
| Integration tests | Terminal-before-409, validation, search literals |

---

## Frontend review outcomes

| Area | Assessment |
|------|------------|
| Acting-user context | `localStorage` persistence; write gating |
| Status controls | Exclusively from `allowedStatuses` |
| Terminal presentation | Read-only banner; hidden edit/comment |
| Error handling | All contract codes mapped |
| `409` flow | Refetch + user retry per `ui-flow.md` |

---

## Documentation review outcomes

| Document | Assessment |
|----------|------------|
| `api-contract.md` | Check orders explicit |
| `ui-flow.md` | Complete screen flows |
| `test-strategy.md` | Full coverage mapping |
| `README.md` | Verified setup on clean checkout |

---

## Enhancements from review

All refinements documented in `review-fixes.md` with commit references and regression tests.

---

## Review checklist (used throughout)

- [x] Matches `api-contract.md` error codes and check order
- [x] Distinguishes `""`, `null`, and `undefined` in validation
- [x] State machine logic only in `ticketStatusService.ts`
- [x] Integration tests cover precedence cases
- [x] Tests run locally with output in `test-results.md`
- [x] Prompt history updated per cycle

---

## Related artifacts

- `review-fixes.md` — enhancement commit mapping
- `debugging-notes.md` — quality engineering log
- `ai-prompts/code-review.md` — prompt history
