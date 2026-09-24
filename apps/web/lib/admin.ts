import { gatewayFetch } from "./gateway-client";

export interface AdminRole {
  role_id: string;
  role_name: string;
}

export interface AdminUser {
  user_id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  status: string;
  user_roles: { role: AdminRole }[];
}

export async function listAllUsers(): Promise<AdminUser[]> {
  return gatewayFetch<AdminUser[]>("/api/v1/users/all");
}

export async function listAllRoles(): Promise<AdminRole[]> {
  return gatewayFetch<AdminRole[]>("/api/v1/users/roles");
}

export async function assignRole(userId: string, roleId: string): Promise<void> {
  await gatewayFetch(`/api/v1/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ role_id: roleId }),
  });
}

export async function removeRole(userId: string, roleId: string): Promise<void> {
  await gatewayFetch(`/api/v1/users/${userId}/roles/${roleId}`, {
    method: "DELETE",
  });
}