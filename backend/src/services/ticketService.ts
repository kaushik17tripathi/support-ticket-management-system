import { Priority, Prisma, TicketStatus } from "@prisma/client";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import {
  canTransition,
  getAllowedTransitions,
  isTerminal,
} from "./ticketStatusService";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

const ticketDetailInclude = {
  createdBy: { select: userSelect },
  assignedTo: { select: userSelect },
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      createdBy: { select: userSelect },
    },
  },
} satisfies Prisma.TicketInclude;

const ticketListInclude = {
  createdBy: { select: userSelect },
  assignedTo: { select: userSelect },
} satisfies Prisma.TicketInclude;

type TicketDetailRecord = Prisma.TicketGetPayload<{
  include: typeof ticketDetailInclude;
}>;

type TicketListRecord = Prisma.TicketGetPayload<{
  include: typeof ticketListInclude;
}>;

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type CommentDto = {
  id: string;
  ticketId: string;
  message: string;
  createdBy: UserSummary;
  createdAt: Date;
};

export type TicketDetailDto = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  assignedTo: UserSummary | null;
  createdBy: UserSummary;
  allowedStatuses: TicketStatus[];
  createdAt: Date;
  updatedAt: Date;
  comments: CommentDto[];
};

export type TicketListItemDto = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  assignedTo: UserSummary | null;
  createdBy: UserSummary;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTicketInput = {
  title: string;
  description: string;
  priority: Priority;
  assignedToId?: string | null;
  createdById: string;
};

export type UpdateTicketFieldsInput = {
  title?: string;
  description?: string;
  priority?: Priority;
  assignedToId?: string | null;
};

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function isValidPriority(value: Priority): boolean {
  return Object.values(Priority).includes(value);
}

function validationError(message: string, details: AppError["details"]): never {
  throw new AppError("VALIDATION_ERROR", 400, message, details);
}

async function assertUserExists(userId: string, field: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    validationError("Validation failed", [
      { field, message: "User does not exist" },
    ]);
  }
}

async function findTicketOrThrow(id: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });

  if (!ticket) {
    throw new AppError("NOT_FOUND", 404, "Ticket not found");
  }

  return ticket;
}

async function findTicketDetailOrThrow(id: string): Promise<TicketDetailRecord> {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: ticketDetailInclude,
  });

  if (!ticket) {
    throw new AppError("NOT_FOUND", 404, "Ticket not found");
  }

  return ticket;
}

function toTicketDetailDto(ticket: TicketDetailRecord): TicketDetailDto {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    assignedTo: ticket.assignedTo,
    createdBy: ticket.createdBy,
    allowedStatuses: getAllowedTransitions(ticket.status),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    comments: ticket.comments.map((comment) => ({
      id: comment.id,
      ticketId: comment.ticketId,
      message: comment.message,
      createdBy: comment.createdBy,
      createdAt: comment.createdAt,
    })),
  };
}

function toTicketListItemDto(ticket: TicketListRecord): TicketListItemDto {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    assignedTo: ticket.assignedTo,
    createdBy: ticket.createdBy,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function validateCreateInput(data: CreateTicketInput): {
  title: string;
  description: string;
  priority: Priority;
  assignedToId: string | null | undefined;
} {
  const details: NonNullable<AppError["details"]> = [];

  const title = data.title?.trim() ?? "";
  if (!title) {
    details.push({ field: "title", message: "Title is required" });
  }

  const description = data.description?.trim() ?? "";
  if (!description) {
    details.push({ field: "description", message: "Description is required" });
  }

  if (!data.priority || !isValidPriority(data.priority)) {
    details.push({ field: "priority", message: "Priority is required and must be valid" });
  }

  if (details.length > 0) {
    validationError("Validation failed", details);
  }

  return {
    title,
    description,
    priority: data.priority,
    assignedToId: data.assignedToId,
  };
}

function validateUpdateFieldsInput(data: UpdateTicketFieldsInput): {
  title?: string;
  description?: string;
  priority?: Priority;
  assignedToId?: string | null;
} {
  const hasAtLeastOneField =
    data.title !== undefined ||
    data.description !== undefined ||
    data.priority !== undefined ||
    data.assignedToId !== undefined;

  if (!hasAtLeastOneField) {
    validationError("Validation failed", [
      { field: "body", message: "At least one updatable field is required" },
    ]);
  }

  const details: NonNullable<AppError["details"]> = [];
  const validated: {
    title?: string;
    description?: string;
    priority?: Priority;
    assignedToId?: string | null;
  } = {};

  if (data.title !== undefined) {
    const title = data.title.trim();
    if (!title) {
      details.push({ field: "title", message: "Title cannot be empty" });
    } else {
      validated.title = title;
    }
  }

  if (data.description !== undefined) {
    const description = data.description.trim();
    if (!description) {
      details.push({ field: "description", message: "Description cannot be empty" });
    } else {
      validated.description = description;
    }
  }

  if (data.priority !== undefined) {
    if (!isValidPriority(data.priority)) {
      details.push({ field: "priority", message: "Priority must be valid" });
    } else {
      validated.priority = data.priority;
    }
  }

  if (data.assignedToId !== undefined) {
    validated.assignedToId = data.assignedToId;
  }

  if (details.length > 0) {
    validationError("Validation failed", details);
  }

  return validated;
}

/**
 * Create a ticket with `status` always set to `OPEN` server-side.
 */
export async function create(data: CreateTicketInput): Promise<TicketDetailDto> {
  const validated = validateCreateInput(data);

  await assertUserExists(data.createdById, "createdById");

  if (validated.assignedToId) {
    await assertUserExists(validated.assignedToId, "assignedToId");
  }

  const ticket = await prisma.ticket.create({
    data: {
      title: validated.title,
      description: validated.description,
      priority: validated.priority,
      status: TicketStatus.OPEN,
      assignedToId: validated.assignedToId ?? null,
      createdById: data.createdById,
    },
    include: ticketDetailInclude,
  });

  return toTicketDetailDto(ticket);
}

/**
 * List tickets with optional case-insensitive search on title and description.
 */
export async function list(params: {
  search?: string;
  status?: TicketStatus;
}): Promise<{ data: TicketListItemDto[]; meta: { count: number } }> {
  const trimmedSearch = params.search?.trim();
  const where: Prisma.TicketWhereInput = {};

  if (params.status) {
    where.status = params.status;
  }

  if (trimmedSearch) {
    const search = escapeLikePattern(trimmedSearch);
    // SQLite LIKE is case-insensitive for ASCII; `mode: insensitive` is not supported.
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: ticketListInclude,
  });

  const data = tickets.map(toTicketListItemDto);

  return {
    data,
    meta: { count: data.length },
  };
}

/**
 * Fetch a single ticket with comments (oldest first) and `allowedStatuses`.
 */
export async function getById(id: string): Promise<TicketDetailDto> {
  const ticket = await findTicketDetailOrThrow(id);
  return toTicketDetailDto(ticket);
}

/**
 * Update editable ticket fields on a non-terminal ticket.
 *
 * Check order (`api-contract.md`): field validation (400) -> ticket exists (404)
 * -> is terminal (422) -> assignedToId FK check (400).
 */
export async function updateFields(
  id: string,
  data: UpdateTicketFieldsInput,
): Promise<TicketDetailDto> {
  const validated = validateUpdateFieldsInput(data);

  const ticket = await findTicketOrThrow(id);

  if (isTerminal(ticket.status)) {
    throw new AppError(
      "TERMINAL_TICKET_READ_ONLY",
      422,
      `Ticket is read-only because it is ${ticket.status}.`,
    );
  }

  if (validated.assignedToId) {
    await assertUserExists(validated.assignedToId, "assignedToId");
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...(validated.title !== undefined ? { title: validated.title } : {}),
      ...(validated.description !== undefined ? { description: validated.description } : {}),
      ...(validated.priority !== undefined ? { priority: validated.priority } : {}),
      ...(validated.assignedToId !== undefined
        ? { assignedToId: validated.assignedToId }
        : {}),
      updatedAt: new Date(),
    },
    include: ticketDetailInclude,
  });

  return toTicketDetailDto(updated);
}

/**
 * Transition ticket status with optimistic concurrency on `expectedStatus`.
 *
 * Check order: ticket exists (404) -> is terminal (422) -> expectedStatus matches
 * current (409) -> same-state check (400) -> canTransition (422) -> atomic update.
 */
export async function transitionStatus(
  id: string,
  status: TicketStatus,
  expectedStatus: TicketStatus,
): Promise<TicketDetailDto> {
  const ticket = await findTicketOrThrow(id);

  if (isTerminal(ticket.status)) {
    throw new AppError(
      "TERMINAL_TICKET_READ_ONLY",
      422,
      `Ticket is read-only because it is ${ticket.status}.`,
    );
  }

  if (ticket.status !== expectedStatus) {
    throw new AppError(
      "STATUS_CONFLICT",
      409,
      `Ticket status has changed. Expected ${expectedStatus} but current status is ${ticket.status}.`,
      [{ field: "expectedStatus", message: "Refresh the ticket and retry." }],
    );
  }

  if (status === ticket.status) {
    validationError("Validation failed", [
      { field: "status", message: "Status transition must change the current status" },
    ]);
  }

  if (!canTransition(ticket.status, status)) {
    const allowed = getAllowedTransitions(ticket.status).join(", ") || "none";
    throw new AppError(
      "INVALID_STATUS_TRANSITION",
      422,
      `Cannot transition from ${ticket.status} to ${status}.`,
      [{ field: "status", message: `Allowed targets from ${ticket.status}: ${allowed}` }],
    );
  }

  const result = await prisma.ticket.updateMany({
    where: { id, status: expectedStatus },
    data: { status, updatedAt: new Date() },
  });

  if (result.count === 0) {
    const current = await prisma.ticket.findUnique({ where: { id } });
    const currentStatus = current?.status ?? "unknown";

    throw new AppError(
      "STATUS_CONFLICT",
      409,
      `Ticket status has changed. Expected ${expectedStatus} but current status is ${currentStatus}.`,
      [{ field: "expectedStatus", message: "Refresh the ticket and retry." }],
    );
  }

  return getById(id);
}
