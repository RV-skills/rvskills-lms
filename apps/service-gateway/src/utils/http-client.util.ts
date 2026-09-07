import { serverConfig } from "../config";
import { getCorrelationId } from "./helpers/request.helpers";
import { BadGatewayError, GatewayTimeoutError } from "@rv-lms/shared-utils";

const TIMEOUT_MS = 5000;

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