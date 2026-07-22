import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";
import { AppError } from "../errors/AppError";

function toValidationError(error: ZodError): AppError {
  return new AppError(
    "VALIDATION_ERROR",
    400,
    "Validation failed",
    error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join(".") : "body",
      message: issue.message,
    })),
  );
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(toValidationError(result.error));
      return;
    }

    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(toValidationError(result.error));
      return;
    }

    Object.assign(req.query, result.data);
    next();
  };
}
