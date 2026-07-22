import { Priority, TicketStatus } from "@prisma/client";
import { z } from "zod";

const prioritySchema = z.enum(
  Object.values(Priority) as [Priority, ...Priority[]],
);

const ticketStatusSchema = z.enum(
  Object.values(TicketStatus) as [TicketStatus, ...TicketStatus[]],
);

const assignedToIdSchema = z
  .string()
  .nullable()
  .optional()
  .refine(
    (value) => value === undefined || value === null || value.trim().length > 0,
    { message: "assignedToId cannot be empty" },
  );

export const createTicketSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: prioritySchema,
  assignedToId: assignedToIdSchema,
});

export const updateTicketSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    priority: prioritySchema.optional(),
    assignedToId: assignedToIdSchema,
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.priority !== undefined ||
      data.assignedToId !== undefined,
    {
      message: "At least one updatable field is required",
      path: ["body"],
    },
  );

export const transitionStatusSchema = z.object({
  status: ticketStatusSchema,
  expectedStatus: ticketStatusSchema,
});

export const listTicketsQuerySchema = z.object({
  search: z.string().optional(),
  status: ticketStatusSchema.optional(),
});

export const createCommentSchema = z.object({
  message: z
    .string()
    .refine((value) => value.trim().length > 0, {
      message: "Message is required",
    }),
});

export type CreateTicketBody = z.infer<typeof createTicketSchema>;
export type UpdateTicketBody = z.infer<typeof updateTicketSchema>;
export type TransitionStatusBody = z.infer<typeof transitionStatusSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type CreateCommentBody = z.infer<typeof createCommentSchema>;
