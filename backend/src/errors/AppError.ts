export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_ACTING_USER"
  | "NOT_FOUND"
  | "STATUS_CONFLICT"
  | "INVALID_STATUS_TRANSITION"
  | "TERMINAL_TICKET_READ_ONLY"
  | "INTERNAL_ERROR";

export interface AppErrorDetail {
  field: string;
  message: string;
}

/**
 * Typed application error mapped to `api-contract.md` error responses by the route layer.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: AppErrorDetail[];

  constructor(
    code: AppErrorCode,
    status: number,
    message: string,
    details?: AppErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
