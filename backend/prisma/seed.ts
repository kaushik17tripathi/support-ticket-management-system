import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  DEV_COMMENTS,
  DEV_TICKETS,
  DEV_USERS,
} from "../../database/seed-data/devSeedData";

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });

  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function seedUsers(): Promise<void> {
  for (const user of DEV_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
      create: user,
    });
  }
}

async function seedTickets(): Promise<void> {
  for (const ticket of DEV_TICKETS) {
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      update: {
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        createdById: ticket.createdById,
        assignedToId: ticket.assignedToId,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
      },
      create: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        createdById: ticket.createdById,
        assignedToId: ticket.assignedToId,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
      },
    });
  }
}

async function seedComments(): Promise<void> {
  for (const comment of DEV_COMMENTS) {
    await prisma.comment.upsert({
      where: { id: comment.id },
      update: {
        ticketId: comment.ticketId,
        message: comment.message,
        createdById: comment.createdById,
        createdAt: new Date(comment.createdAt),
      },
      create: {
        id: comment.id,
        ticketId: comment.ticketId,
        message: comment.message,
        createdById: comment.createdById,
        createdAt: new Date(comment.createdAt),
      },
    });
  }
}

async function main(): Promise<void> {
  await seedUsers();
  await seedTickets();
  await seedComments();

  const [userCount, ticketCount, commentCount] = await Promise.all([
    prisma.user.count(),
    prisma.ticket.count(),
    prisma.comment.count(),
  ]);

  console.log(
    `Seed complete: ${userCount} users, ${ticketCount} tickets, ${commentCount} comments`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
