import { ApiError } from "../api/client";

export function mapFieldErrors(
  error: ApiError,
): Record<string, string> {
  const mapped: Record<string, string> = {};

  for (const detail of error.details ?? []) {
    const key = detail.field.replace(/^body\./, "");
    mapped[key] = detail.message;
  }

  return mapped;
}

export function userFacingMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR") {
      return "Unable to reach server. Check your connection and try again.";
    }

    if (error.code === "INTERNAL_ERROR") {
      return "Something went wrong. Please try again.";
    }

    return error.message;
  }

  return "Something went wrong. Please try again.";
}
