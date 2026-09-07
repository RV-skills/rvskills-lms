import { serverConfig } from "../config";
import { BadGatewayError, UnauthorizedError, ConflictError } from "@rv-lms/shared-utils";
import type { AuthTokenDTO, UserDTO } from "@rv-lms/shared-types";
import { fetchWithTimeout, correlationHeaders } from "../utils/http-client.util";

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
    const body = (await res.json()) as { message?: string };
    throw new ConflictError(body.message || "Registration failed");
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
    throw new BadGatewayError("Failed to log out");
  }
}