"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/user-session";
import { GatewayError } from "@/lib/gateway-client";
import { AdminSidebarNav } from "@/components/admin-sidebar-nav";
import {
  listAllUsers,
  listAllRoles,
  assignRole,
  removeRole,
  adminCreateUser,
  adminBatchCreateStudents,
  setUserStatus,
  resetUserPassword,
  type AdminUser,
  type AdminRole,
  type CreatedUserResult,
  type BatchCreateResult,
} from "@/lib/admin";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: sessionUser, loading: sessionLoading } = useSession({ redirectOnUnauthorized: false });
  const [users, setUsers] = useState<AdminUser[] | undefined>(undefined);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<CreatedUserResult | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [batchUploading, setBatchUploading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchCreateResult | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resetResult, setResetResult] = useState<{ userId: string; password: string } | null>(null);

  useEffect(() => {
    if (!createResult) return;
    const timeout = setTimeout(() => setCreateResult(null), 30000);
    return () => clearTimeout(timeout);
  }, [createResult]);

  useEffect(() => {
    if (!resetResult) return;
    const timeout = setTimeout(() => setResetResult(null), 30000);
    return () => clearTimeout(timeout);
  }, [resetResult]);

  useEffect(() => {
    if (!batchResult) return;
    const timeout = setTimeout(() => setBatchResult(null), 30000);
    return () => clearTimeout(timeout);
  }, [batchResult]);

  useEffect(() => {
    if (!sessionLoading && !sessionUser) {
      router.push("/login");
    }
  }, [sessionLoading, sessionUser, router]);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof GatewayError && (err.statusCode === 401 || err.statusCode === 403)) {
      router.push("/login");
      return true;
    }
    return false;
  }

  const loadRoles = useCallback(() => {
    listAllRoles().then(setRoles);
  }, []);

  const loadUsers = useCallback(() => {
    listAllUsers({
      search: search || undefined,
      role_id: roleFilter || undefined,
      status: statusFilter || undefined,
    })
      .then(setUsers)
      .catch((err) => {
        if (!handleAuthError(err)) throw err;
      });
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
    } catch (err) {
      if (!handleAuthError(err)) throw err;
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleToggleStatus(user: AdminUser) {
    const newStatus = user.status === "active" ? "inactive" : "active";
    setUpdatingKey(`status:${user.user_id}`);
    try {
      await setUserStatus(user.user_id, newStatus);
      loadUsers();
    } catch (err) {
      if (!handleAuthError(err)) throw err;
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleResetPassword(user: AdminUser) {
    setUpdatingKey(`reset:${user.user_id}`);
    try {
      const result = await resetUserPassword(user.user_id);
      setResetResult({ userId: user.user_id, password: result.generated_password });
    } catch (err) {
      if (!handleAuthError(err)) throw err;
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateResult(null);
    try {
      const result = await adminCreateUser({
        first_name: newFirstName,
        last_name: newLastName,
        username: newUsername,
        email: newEmail,
        role_id: newRoleId,
      });
      setCreateResult(result);
      setNewFirstName("");
      setNewLastName("");
      setNewUsername("");
      setNewEmail("");
      setNewRoleId("");
      loadUsers();
    } catch (err) {
      if (handleAuthError(err)) return;
      setCreateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  function parseCsv(text: string): { first_name: string; last_name: string; username: string; email: string }[] {
    const lines = text.trim().split("\n").filter((l) => l.trim().length > 0);
    const [, ...dataLines] = lines;
    return dataLines.map((line) => {
      const [first_name, last_name, username, email] = line.split(",").map((v) => v.trim());
      return { first_name, last_name, username, email };
    });
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBatchUploading(true);
    setBatchError(null);
    setBatchResult(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const result = await adminBatchCreateStudents(rows);
      setBatchResult(result);
      loadUsers();
    } catch (err) {
      if (handleAuthError(err)) return;
      setBatchError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBatchUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (sessionLoading || !sessionUser) {
    return <main className="p-10 text-sm text-neutral-500">Loading...</main>;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebarNav />
      <main className="flex-1 overflow-x-hidden px-8 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-neutral-900">Users</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateForm((s) => !s)}
              className="rounded-md bg-primary-500 px-4 py-2 text-sm text-white"
            >
              Create user
            </button>
            <label className="cursor-pointer rounded-md border border-neutral-500 px-4 py-2 text-sm text-neutral-900">
              {batchUploading ? "Uploading..." : "Upload CSV (students)"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
                disabled={batchUploading}
              />
            </label>
          </div>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-neutral-50 p-4">
            <div>
              <label className="text-xs text-neutral-500">First name</label>
              <input
                required
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className="block rounded-md border border-neutral-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Last name</label>
              <input
                required
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className="block rounded-md border border-neutral-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Username</label>
              <input
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="block rounded-md border border-neutral-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Email</label>
              <input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="block rounded-md border border-neutral-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Role</label>
              <select
                required
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
                className="block rounded-md border border-neutral-100 px-3 py-2 text-sm"
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-primary-500 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        )}

        {createError && <p className="mt-3 text-sm text-danger">{createError}</p>}

        {createResult && (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-md bg-success/10 px-4 py-3 text-sm text-success">
            <span>
              Created {createResult.user.first_name} {createResult.user.last_name} ({createResult.user.email}).
              Generated password: <span className="font-medium">{createResult.generated_password}</span>
            </span>
            <button onClick={() => setCreateResult(null)} className="text-success hover:opacity-70">
              &times;
            </button>
          </div>
        )}

        {batchError && <p className="mt-3 text-sm text-danger">{batchError}</p>}

        {batchResult && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex justify-end">
              <button onClick={() => setBatchResult(null)} className="text-sm text-neutral-500 hover:text-neutral-900">
                Dismiss
              </button>
            </div>
            {batchResult.created.length > 0 && (
              <div className="rounded-md bg-success/10 p-4 text-sm text-success">
                <p className="font-medium">{batchResult.created.length} account(s) created:</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {batchResult.created.map((c) => (
                    <li key={c.user.user_id}>
                      {c.user.email} — password: <span className="font-medium">{c.generated_password}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {batchResult.failed.length > 0 && (
              <div className="rounded-md bg-danger-light p-4 text-sm text-danger">
                <p className="font-medium">{batchResult.failed.length} row(s) failed:</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {batchResult.failed.map((f, i) => (
                    <li key={i}>
                      {f.row.email}: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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
                  <th className="px-4 py-3 font-medium text-neutral-500">Status</th>
                  <th className="px-4 py-3 font-medium text-neutral-500"></th>
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
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={updatingKey === `status:${user.user_id}`}
                          className={
                            user.status === "active"
                              ? "rounded-full bg-success/10 px-2.5 py-1 text-xs text-success"
                              : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500"
                          }
                        >
                          {user.status}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleResetPassword(user)}
                          disabled={updatingKey === `reset:${user.user_id}`}
                          className="text-xs text-primary-700 underline disabled:opacity-50"
                        >
                          Reset password
                        </button>
                        {resetResult?.userId === user.user_id && (
                          <p className="mt-1 text-xs text-neutral-500">
                            New password: <span className="font-medium">{resetResult.password}</span>
                          </p>
                        )}
                      </td>
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