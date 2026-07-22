import { TicketStatus, Priority } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      actingUserId: string;
    }
  }
}

export {};
