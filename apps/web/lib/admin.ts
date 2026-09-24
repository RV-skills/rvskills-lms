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

export interface AdminCourse {
  course_id: string;
  title: string;
  difficulty: string;
  status: string;
  is_published: boolean;
  instructorName: string;
  facultyCount: number;
}


export interface CreatedUserResult {
  user: AdminUser;
  generated_password: string;
}

export interface BatchCreateResult {
  created: CreatedUserResult[];
  failed: { row: { first_name: string; last_name: string; username: string; email: string }; reason: string }[];
}

export interface CreatedUserResult {
  user: AdminUser;
  generated_password: string;
}

export interface BatchCreateResult {
  created: CreatedUserResult[];
  failed: { row: { first_name: string; last_name: string; username: string; email: string }; reason: string }[];
}

export interface CourseFacultyRecord {
  course_id: string;
  faculty_id: string;
  tenant_id: string;
  role: string;
}

export async function adminCreateUser(data: {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role_id: string;
}): Promise<CreatedUserResult> {
  return gatewayFetch<CreatedUserResult>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function adminBatchCreateStudents(
  rows: { first_name: string; last_name: string; username: string; email: string }[]
): Promise<BatchCreateResult> {
  return gatewayFetch<BatchCreateResult>("/api/v1/users/batch", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

export async function listAllUsers(filters?: {
  search?: string;
  role_id?: string;
  status?: string;
}): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.role_id) params.set("role_id", filters.role_id);
  if (filters?.status) params.set("status", filters.status);
  const query = params.toString();
  return gatewayFetch<AdminUser[]>(`/api/v1/users/all${query ? `?${query}` : ""}`);
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

export async function listCoursesForAdmin(): Promise<AdminCourse[]> {
  return gatewayFetch<AdminCourse[]>("/api/v1/courses/admin/all");
}

export async function publishCourse(courseId: string): Promise<void> {
  await gatewayFetch(`/api/v1/courses/${courseId}/publish`, { method: "PATCH" });
}

export async function unpublishCourse(courseId: string): Promise<void> {
  await gatewayFetch(`/api/v1/courses/${courseId}/unpublish`, { method: "PATCH" });
}

export async function listCourseFaculty(courseId: string): Promise<CourseFacultyRecord[]> {
  return gatewayFetch<CourseFacultyRecord[]>(`/api/v1/courses/${courseId}/faculty`);
}

export async function assignCourseFaculty(courseId: string, facultyId: string): Promise<void> {
  await gatewayFetch(`/api/v1/courses/${courseId}/faculty`, {
    method: "POST",
    body: JSON.stringify({ faculty_id: facultyId }),
  });
}

export async function removeCourseFaculty(courseId: string, facultyId: string): Promise<void> {
  await gatewayFetch(`/api/v1/courses/${courseId}/faculty/${facultyId}`, {
    method: "DELETE",
  });
}