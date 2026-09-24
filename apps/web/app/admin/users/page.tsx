"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSidebarNav } from "@/components/admin-sidebar-nav";
import {
  listAllUsers,
  listAllRoles,
  assignRole,
  removeRole,
  type AdminUser,
  type AdminRole,
} from "@/lib/admin";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | undefined>(undefined);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadRoles = useCallback(() => {
    listAllRoles().then(setRoles);
  }, []);

  const loadUsers = useCallback(() => {
    listAllUsers({
      search: search || undefined,
      role_id: roleFilter || undefined,
      status: statusFilter || undefined,
    }).then(setUsers);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    const timeout = setTimeout(loadUsers, 300);
    return () => clearTimeout(timeout);
  }, [loadUsers]);

  async function handleToggle(user: AdminUser, roleId: string, currentlyHasRole: boolean) {
    const key = `${user.user_id}:${roleId}`;
    setUpdatingKey(key);
    try {
      if (currentlyHasRole) {
        await removeRole(user.user_id, roleId);
      } else {
        await assignRole(user.user_id, roleId);
      }
      loadUsers();
    } finally {
      setUpdatingKey(null);
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebarNav />
      <main className="flex-1 overflow-x-hidden px-8 py-10">
        <h1 className="text-2xl text-neutral-900">Users</h1>

        <div className="mt-6 flex gap-3">
          <input
            type="text"
            placeholder="Search by name, email, or username"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-md border border-neutral-100 px-3 py-2 text-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md border border-neutral-100 px-3 py-2 text-sm"
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role.role_id} value={role.role_id}>
                {role.role_name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-neutral-100 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {users === undefined ? (
          <p className="mt-6 text-sm text-neutral-500">Loading...</p>
        ) : users.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-500">No users match your search.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-100">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-neutral-500">Name</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Email</th>
                  {roles.map((role) => (
                    <th key={role.role_id} className="px-4 py-3 font-medium text-neutral-500">
                      {role.role_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const heldRoleIds = new Set(user.user_roles.map((ur) => ur.role.role_id));
                  return (
                    <tr key={user.user_id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-3 text-neutral-900">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{user.email}</td>
                      {roles.map((role) => {
                        const hasRole = heldRoleIds.has(role.role_id);
                        const key = `${user.user_id}:${role.role_id}`;
                        return (
                          <td key={role.role_id} className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={hasRole}
                              disabled={updatingKey === key}
                              onChange={() => handleToggle(user, role.role_id, hasRole)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}