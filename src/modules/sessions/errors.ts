import { ApiRouteError } from "@/lib/api-errors";

export class SessionServiceError extends ApiRouteError {
  override name = "SessionServiceError";
}
