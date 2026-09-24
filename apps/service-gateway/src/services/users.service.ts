import { serverConfig } from "../config";
import { fetchWithTimeout, correlationHeaders } from "../utils/http-client.util";
import { BadGatewayError, UnauthorizedError, ForbiddenError } from "@rv-lms/shared-utils";
import type { UserSummaryDTO } from "@rv-lms/shared-types";

export interface AdminUserSummary {
  user_id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  status: string;
  user_roles: { role: { role_id: string; role_name: string } }[];
}

export interface RoleSummary {
  role_id: string;
  role_name: string;
}

export interface CreatedUserResult {
  user: AdminUserSummary;
  generated_password: string;
}

export interface BatchCreateRow {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
}

export interface BatchCreateResult {
  created: CreatedUserResult[];
  failed: { row: BatchCreateRow; reason: string }[];
}

export async function listAllUsers(
  accessToken: string,
  filters?: { search?: string; role_id?: string; status?: string }
): Promise<AdminUserSummary[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.role_id) params.set("role_id", filters.role_id);
  if (filters?.status) params.set("status", filters.status);
  const query = params.toString();

  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_AUTH_URL}/api/v1/users/all${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...correlationHeaders(),
      },
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new UnauthorizedError("Your session has expired. Please log in again.");
    }
    if (res.status === 403) {
      throw new ForbiddenError("You do not have permission to do this.");
    }
    throw new BadGatewayError(`service-auth returned ${res.status} for list all users`);
  }

  const body = (await res.json()) as { success: boolean; data: AdminUserSummary[] };
  return body.data;
}

export async function listAllRoles(accessToken: string): Promise<RoleSummary[]> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_AUTH_URL}/api/v1/users/roles`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new UnauthorizedError("Your session has expired. Please log in again.");
    }
    if (res.status === 403) {
      throw new ForbiddenError("You do not have permission to do this.");
    }
    throw new BadGatewayError(`service-auth returned ${res.status} for list all users`);
  }

  const body = (await res.json()) as { success: boolean; data: RoleSummary[] };
  return body.data;
}

export async function assignRoleToUser(
  user_id: string,
  role_id: string,
  accessToken: string
): Promise<void> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_AUTH_URL}/api/v1/users/${user_id}/roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
    body: JSON.stringify({ role_id }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new UnauthorizedError("Your session has expired. Please log in again.");
    }
    if (res.status === 403) {
      throw new ForbiddenError("You do not have permission to do this.");
    }
    throw new BadGatewayError(`service-auth returned ${res.status} for list all users`);
  }
}

export async function removeRoleFromUser(
  user_id: string,
  role_id: string,
  accessToken: string
): Promise<void> {
  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_AUTH_URL}/api/v1/users/${user_id}/roles/${role_id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...correlationHeaders(),
      },
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new UnauthorizedError("Your session has expired. Please log in again.");
    }
    if (res.status === 403) {
      throw new ForbiddenError("You do not have permission to do this.");
    }
    throw new BadGatewayError(`service-auth returned ${res.status} for list all users`);
  }
}

export async function getUsersByIds(userIds: string[], accessToken: string): Promise<UserSummaryDTO[]> {
  if (userIds.length === 0) return [];

  const uniqueIds = [...new Set(userIds)];
  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_AUTH_URL}/api/v1/users?ids=${uniqueIds.join(",")}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...correlationHeaders(),
      },
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new UnauthorizedError("Your session has expired. Please log in again.");
    }
    if (res.status === 403) {
      throw new ForbiddenError("You do not have permission to do this.");
    }
    throw new BadGatewayError(`service-auth returned ${res.status} for list all users`);
  }

  const body = (await res.json()) as { success: boolean; data: UserSummaryDTO[] };
  return body.data;
}

export async function adminCreateUser(
  data: { first_name: string; last_name: string; username: string; email: string; role_id: string },
  accessToken: string
): Promise<CreatedUserResult> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_AUTH_URL}/api/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
    body: JSON.stringify(data),
  });

  const body = (await res.json()) as { success: boolean; message?: string; data?: CreatedUserResult };

  if (!res.ok) {
    if (res.status === 401) {
      throw new UnauthorizedError("Your session has expired. Please log in again.");
    }
    if (res.status === 403) {
      throw new ForbiddenError("You do not have permission to do this.");
    }
    throw new BadGatewayError(`service-auth returned ${res.status} for list all users`);
  }

  return body.data as CreatedUserResult;
}

export async function adminBatchCreateStudents(
  rows: BatchCreateRow[],
  accessToken: string
): Promise<BatchCreateResult> {
  const res = await fetchWithTimeout(`${serverConfig.SERVICE_AUTH_URL}/api/v1/users/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...correlationHeaders(),
    },
    body: JSON.stringify({ rows }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new UnauthorizedError("Your session has expired. Please log in again.");
    }
    if (res.status === 403) {
      throw new ForbiddenError("You do not have permission to do this.");
    }
    throw new BadGatewayError(`service-auth returned ${res.status} for list all users`);
  }

  const body = (await res.json()) as { success: boolean; data: BatchCreateResult };
  return body.data;
}