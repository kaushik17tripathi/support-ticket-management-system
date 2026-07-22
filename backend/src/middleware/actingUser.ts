import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { assertUserExists } from "../services/userValidation";

const ACTING_USER_HEADER = "x-acting-user-id";

/**
 * Validates `X-Acting-User-Id` and attaches `req.actingUserId`.
 * Apply only to mutating routes.
 */
export async function actingUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const headerValue = req.headers[ACTING_USER_HEADER];
  const actingUserId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!actingUserId || actingUserId.trim() === "") {
    next(new AppError("INVALID_ACTING_USER", 400, "Missing or invalid acting user"));
    return;
  }

  try {
    await assertUserExists(actingUserId, "X-Acting-User-Id");
  } catch {
    next(new AppError("INVALID_ACTING_USER", 400, "Missing or invalid acting user"));
    return;
  }

  req.actingUserId = actingUserId;
  next();
}
