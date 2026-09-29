import { serverConfig } from "../config";
import { UnauthorizedError, ConflictError } from "@rv-lms/shared-utils";
import type { AuthTokenDTO, UserDTO } from "@rv-lms/shared-types";
import { fetchWithTimeout, correlationHeaders, throwForFailedResponse } from "../utils/http-client.util";

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
    await throwForFailedResponse(res, `service-auth returned ${res.status} for /me`);
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

  // Only a real 401 means the refresh token itself is invalid or expired.
  // Any other failure (service-auth down, a real server error) is a
  // different problem and must not be reported to the user as "your
  // session expired" -- that was actively misleading them before this fix.
  if (res.status === 401) {
    throw new UnauthorizedError("Refresh token is invalid or expired");
  }
  if (!res.ok) {
    await throwForFailedResponse(res, `service-auth returned ${res.status} for /refresh`);
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

  // Only a real 401 means the credentials themselves were wrong. A service
  // outage must not tell the user their email or password was incorrect.
  if (res.status === 401) {
    throw new UnauthorizedError("Invalid email or password");
  }
  if (!res.ok) {
    await throwForFailedResponse(res, `service-auth returned ${res.status} for /login`);
  }

  const body = (await res.json()) as { success: boolean; data: AuthTokenDTO };
  return body.data;
}

export interface RegisterInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  username: string;
}

export async function register(input: RegisterInput): Promise<void> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_AUTH_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...correlationHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as { message?: string } | undefined;
    // A real 409 means the email or username is genuinely taken. Anything
    // else (a validation error, a real outage) should not be forced into
    // that same "already exists" shape.
    if (res.status === 409) {
      throw new ConflictError(body?.message || "Registration failed");
    }
    await throwForFailedResponse(res, "Registration failed", body);
  }
}

export async function logout(refreshToken: string): Promise<void> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_AUTH_URL}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...correlationHeaders(),
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    await throwForFailedResponse(res, "Failed to log out");
  }
}