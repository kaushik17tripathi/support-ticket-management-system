export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type Comment = {
  id: string;
  ticketId: string;
  message: string;
  createdBy: UserSummary;
  createdAt: string;
};

export type TicketListItem = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  assignedTo: UserSummary | null;
  createdBy: UserSummary;
  createdAt: string;
  updatedAt: string;
};

export type TicketDetail = TicketListItem & {
  allowedStatuses: TicketStatus[];
  comments: Comment[];
};

export type ErrorDetail = {
  field: string;
  message: string;
};

export type ErrorBody = {
  code: string;
  message: string;
  details?: ErrorDetail[];
};

export type CreateTicketPayload = {
  title: string;
  description: string;
  priority: Priority;
  assignedToId?: string | null;
};

export type UpdateTicketPayload = {
  title?: string;
  description?: string;
  priority?: Priority;
  assignedToId?: string | null;
};

export type TransitionStatusPayload = {
  status: TicketStatus;
  expectedStatus: TicketStatus;
};
