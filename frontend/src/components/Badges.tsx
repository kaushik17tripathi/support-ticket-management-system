import type { Priority, TicketStatus } from "../api/types";
import { formatPriority, formatStatus } from "../utils/labels";

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`badge badge-status badge-status-${status.toLowerCase()}`}>{formatStatus(status)}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`badge badge-priority badge-priority-${priority.toLowerCase()}`}>
      {formatPriority(priority)}
    </span>
  );
}
