import { APIError } from "better-auth/api";
import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth/authorization";

import { jsonResponse } from "./http";

export class ApiRouteError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRouteError";
  }
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiRouteError) {
    return jsonResponse(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  if (error instanceof AuthorizationError) {
    return jsonResponse(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return jsonResponse(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data yang dikirim tidak valid.",
        },
      },
      { status: 422 },
    );
  }

  if (error instanceof APIError) {
    const rateLimited = error.status === "TOO_MANY_REQUESTS";

    return jsonResponse(
      {
        error: {
          code: rateLimited ? "RATE_LIMITED" : "AUTH_ERROR",
          message: rateLimited
            ? "Terlalu banyak percobaan. Coba lagi nanti."
            : "Permintaan autentikasi tidak dapat diproses.",
        },
      },
      { status: error.statusCode },
    );
  }

  console.error("Request failed", {
    error: error instanceof Error ? error.message : "Unknown error",
  });

  return jsonResponse(
    {
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Layanan sedang bermasalah. Coba lagi.",
      },
    },
    { status: 503 },
  );
}
