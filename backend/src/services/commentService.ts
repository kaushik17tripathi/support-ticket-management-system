import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";
import { CommentDto } from "./ticketService";
import { isTerminal } from "./ticketStatusService";
import { assertUserExists } from "./userValidation";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

function validationError(message: string, details: AppError["details"]): never {
  throw new AppError("VALIDATION_ERROR", 400, message, details);
}

/**
 * Add a comment to a non-terminal ticket.
 *
 * Check order (`api-contract.md`, service layer):
 * 1. message present and non-empty after trim -> 400 VALIDATION_ERROR
 * 2. createdById references existing user -> 400 VALIDATION_ERROR
 * 3. ticket exists -> 404 NOT_FOUND
 * 4. ticket is terminal -> 422 TERMINAL_TICKET_READ_ONLY
 */
export async function create(
  ticketId: string,
  message: string,
  createdById: string,
): Promise<CommentDto> {
  const trimmedMessage = message?.trim() ?? "";

  if (!trimmedMessage) {
    validationError("Validation failed", [
      { field: "message", message: "Message is required" },
    ]);
  }

  await assertUserExists(createdById, "createdById");

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

  if (!ticket) {
    throw new AppError("NOT_FOUND", 404, "Ticket not found");
  }

  if (isTerminal(ticket.status)) {
    throw new AppError(
      "TERMINAL_TICKET_READ_ONLY",
      422,
      `Ticket is read-only because it is ${ticket.status}.`,
    );
  }

  const comment = await prisma.comment.create({
    data: {
      ticketId,
      message: trimmedMessage,
      createdById,
    },
    include: {
      createdBy: { select: userSelect },
    },
  });

  return {
    id: comment.id,
    ticketId: comment.ticketId,
    message: comment.message,
    createdBy: comment.createdBy,
    createdAt: comment.createdAt,
  };
}
