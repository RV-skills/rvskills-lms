import { serverConfig } from "../config";
import { getCorrelationId } from "./helpers/request.helpers";
import {
  BadGatewayError,
  GatewayTimeoutError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  type FieldError
} from "@rv-lms/shared-utils";

const TIMEOUT_MS = 15000;

export async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new GatewayTimeoutError(`Request to ${url} timed out after ${TIMEOUT_MS}ms`);
    }
    throw new BadGatewayError(`Failed to reach ${url}`);
  } finally {
    clearTimeout(timeout);
  }
}

export function correlationHeaders(): Record<string, string> {
  return { "x-correlation-id": getCorrelationId() };
}

// Keep only well-formed { field, message } entries from another service's error response.
function toFieldErrors(raw: unknown): FieldError[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid = raw.filter(
    (e): e is FieldError =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as FieldError).field === "string" &&
      typeof (e as FieldError).message === "string"
  );
  return valid.length > 0 ? valid : undefined;
}

export async function throwForFailedResponse(
  res: Response,
  fallbackMessage: string,
  parsedBody?: { message?: string; errors?: unknown }
): Promise<never> {
  const body = (parsedBody ??
    (await res.json().catch(() => undefined))) as
    | { message?: string; errors?: unknown }
    | undefined;
  const message = body?.message ?? fallbackMessage;

  switch (res.status) {
    case 400:
      throw new ValidationError(message, toFieldErrors(body?.errors));
    case 401:
      throw new UnauthorizedError(message);
    case 403:
      throw new ForbiddenError(message);
    case 404:
      throw new NotFoundError(message);
    case 409:
      throw new ConflictError(message);
    default:
      throw new BadGatewayError(message);
  }
}