import { serverConfig } from "../config";
import { getCorrelationId } from "../utils/helpers/request.helpers";
import { BadGatewayError, GatewayTimeoutError, UnauthorizedError } from "@rv-lms/shared-utils";
import type { AuthTokenDTO, UserDTO } from "@rv-lms/shared-types";

const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
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

function correlationHeaders(): Record<string, string> {
  return { "x-correlation-id": getCorrelationId() };
}

export async function verifyAccessToken(accessToken: string): Promise<UserDTO> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_AUTH_URL}/api/v1/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
  });

  if (res.status === 401) {
    throw new UnauthorizedError("Access token is invalid or expired");
  }
  if (!res.ok) {
    throw new BadGatewayError(`service-auth returned ${res.status} for /me`);
  }

  const body = (await res.json()) as { success: boolean; data: UserDTO };
  return body.data as UserDTO;
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokenDTO> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_AUTH_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...correlationHeaders(),
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    throw new UnauthorizedError("Refresh token is invalid or expired");
  }

  const body = (await res.json()) as { success: boolean; data: AuthTokenDTO };
  return body.data as AuthTokenDTO;
}

export async function login(email: string, password: string): Promise<AuthTokenDTO> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_AUTH_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...correlationHeaders(),
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const body = (await res.json()) as { success: boolean; data: AuthTokenDTO };
  return body.data;
}