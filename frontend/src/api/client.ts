import type {
  CreateTicketPayload,
  ErrorBody,
  TicketDetail,
  TicketListItem,
  TicketStatus,
  TransitionStatusPayload,
  UpdateTicketPayload,
  UserSummary,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ErrorBody["details"];

  constructor(status: number, error: ErrorBody) {
    super(error.message);
    this.name = "ApiError";
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

type RequestOptions = RequestInit & {
  actingUserId?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.actingUserId) {
    headers.set("X-Acting-User-Id", options.actingUserId);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "Unable to reach server",
    });
  }

  const body = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, body.error as ErrorBody);
  }

  return body as T;
}

export async function fetchUsers(): Promise<UserSummary[]> {
  const result = await request<{ data: UserSummary[] }>("/users");
  return result.data;
}

export async function fetchTickets(params: {
  search?: string;
  status?: TicketStatus;
}): Promise<{ data: TicketListItem[]; meta: { count: number } }> {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.status) {
    query.set("status", params.status);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<{ data: TicketListItem[]; meta: { count: number } }>(`/tickets${suffix}`);
}

export async function fetchTicket(id: string): Promise<TicketDetail> {
  const result = await request<{ data: TicketDetail }>(`/tickets/${id}`);
  return result.data;
}

export async function createTicket(
  payload: CreateTicketPayload,
  actingUserId: string,
): Promise<TicketDetail> {
  const body: CreateTicketPayload = {
    title: payload.title,
    description: payload.description,
    priority: payload.priority,
  };

  if (payload.assignedToId) {
    body.assignedToId = payload.assignedToId;
  }

  const result = await request<{ data: TicketDetail }>("/tickets", {
    method: "POST",
    actingUserId,
    body: JSON.stringify(body),
  });

  return result.data;
}

export async function updateTicket(
  id: string,
  payload: UpdateTicketPayload,
  actingUserId: string,
): Promise<TicketDetail> {
  const result = await request<{ data: TicketDetail }>(`/tickets/${id}`, {
    method: "PATCH",
    actingUserId,
    body: JSON.stringify(payload),
  });

  return result.data;
}

export async function transitionTicketStatus(
  id: string,
  payload: TransitionStatusPayload,
  actingUserId: string,
): Promise<TicketDetail> {
  const result = await request<{ data: TicketDetail }>(`/tickets/${id}/status`, {
    method: "PATCH",
    actingUserId,
    body: JSON.stringify(payload),
  });

  return result.data;
}

export async function createComment(
  ticketId: string,
  message: string,
  actingUserId: string,
): Promise<void> {
  await request(`/tickets/${ticketId}/comments`, {
    method: "POST",
    actingUserId,
    body: JSON.stringify({ message }),
  });
}
