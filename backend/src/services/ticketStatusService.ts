import { TicketStatus } from "@prisma/client";

/**
 * Authoritative ticket status state machine for Core.
 *
 * Single source of truth per `design-notes.md` — all transition rules live here.
 * Controllers, `TicketService`, and the UI (via `allowedStatuses` in API responses)
 * must consume these helpers; do not duplicate transition logic elsewhere.
 *
 * Allowed transitions (`api-contract.md`):
 * - OPEN → IN_PROGRESS, CANCELLED
 * - IN_PROGRESS → RESOLVED, CANCELLED
 * - RESOLVED → CLOSED
 * - CLOSED → (none, terminal)
 * - CANCELLED → (none, terminal)
 */
const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [],
  [TicketStatus.CANCELLED]: [],
};

/**
 * Returns whether a transition from `from` to `to` is permitted by the state machine.
 */
export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Returns the list of valid target statuses from `from`.
 * Powers `allowedStatuses` in API responses (`design-notes.md`).
 */
export function getAllowedTransitions(from: TicketStatus): TicketStatus[] {
  return [...ALLOWED_TRANSITIONS[from]];
}

/**
 * Returns whether `status` is terminal (read-only: no field edits, status changes, or new comments).
 * Derived from `ALLOWED_TRANSITIONS`: terminal iff no outbound transitions are defined.
 */
export function isTerminal(status: TicketStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
