import { ApiRouteError } from "@/lib/api-errors";

export class StudentServiceError extends ApiRouteError {
  override name = "StudentServiceError";
}

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvParseError";
  }
}
