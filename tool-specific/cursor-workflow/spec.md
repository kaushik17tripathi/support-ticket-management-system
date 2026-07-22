# Spec

Cursor should treat these root documents as the specification — not this file alone.

| Document | Scope |
|----------|--------|
| [requirements-analysis.md](../../requirements-analysis.md) | Functional requirements, assumptions |
| [acceptance-criteria.md](../../acceptance-criteria.md) | Verifiable checklist |
| [api-contract.md](../../api-contract.md) | REST API, errors, **check orders** |
| [data-model.md](../../data-model.md) | Prisma schema, ERD |
| [ui-flow.md](../../ui-flow.md) | Frontend screens and error surfacing |
| [design-notes.md](../../design-notes.md) | Architecture synthesis |

## State machine (reference)

```
OPEN         → IN_PROGRESS, CANCELLED
IN_PROGRESS  → RESOLVED, CANCELLED
RESOLVED     → CLOSED
CLOSED       → (terminal)
CANCELLED    → (terminal)
```

Enforced in `ticketStatusService.ts`; exposed as `allowedStatuses` in API responses.

## Acting user

Header `X-Acting-User-Id` on POST/PATCH. Frontend: dropdown + `localStorage`. No auth.
