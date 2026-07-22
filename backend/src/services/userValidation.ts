import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";

/**
 * Validates that a user ID references an existing seeded user.
 * Throws `400 VALIDATION_ERROR` when the user does not exist.
 */
export async function assertUserExists(userId: string, field: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("VALIDATION_ERROR", 400, "Validation failed", [
      { field, message: "User does not exist" },
    ]);
  }
}
