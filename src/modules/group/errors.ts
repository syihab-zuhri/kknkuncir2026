import { ApiRouteError } from "@/lib/api-errors";

export class GroupServiceError extends ApiRouteError {
  override name = "GroupServiceError";
}
