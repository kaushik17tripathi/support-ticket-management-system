import type { Priority, TicketStatus } from "../api/types";

export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];

export const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function formatStatus(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
    CANCELLED: "Cancelled",
  };

  return labels[status];
}

export function formatPriority(priority: Priority): string {
  const labels: Record<Priority, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  };

  return labels[priority];
}

/** Human-readable action label for a target status button (display only — allowed targets come from API). */
export function transitionActionLabel(target: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    OPEN: "Reopen",
    IN_PROGRESS: "Start progress",
    RESOLVED: "Mark resolved",
    CLOSED: "Close ticket",
    CANCELLED: "Cancel ticket",
  };

  return labels[target];
}

export function isTerminalStatus(status: TicketStatus): boolean {
  return status === "CLOSED" || status === "CANCELLED";
}
