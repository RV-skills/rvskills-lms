import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  register,
  login,
  getProfile,
  refresh,
  logout,
  getUsersByIds,
  listUsers,
  listRoles,
  assignRole,
  removeRole,
  adminCreateUser,
  adminBatchCreateStudents,
  adminSetUserStatus,
  adminResetPassword,
} from "../user.controller";
import { userService } from "../../services/user.service";
import { authService } from "../../services/auth.service";
import { ValidationError } from "@rv-lms/shared-utils";

vi.mock("../../services/user.service", () => ({
  userService: {
    register: vi.fn(),
    getProfile: vi.fn(),
    getUsersByIds: vi.fn(),
    listAllUsers: vi.fn(),
    listAllRoles: vi.fn(),
    assignRoleToUser: vi.fn(),
    removeRoleFromUser: vi.fn(),
    adminCreateUser: vi.fn(),
    adminBatchCreateStudents: vi.fn(),
    adminSetUserStatus: vi.fn(),
    adminResetPassword: vi.fn(),
  },
}));

vi.mock("../../services/auth.service", () => ({
  authService: {
    login: vi.fn(),
    refreshAccessToken: vi.fn(),
    logout: vi.fn(),
  },
}));

const userSvc = vi.mocked(userService);
const authSvc = vi.mocked(authService);

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

function fakeReq(overrides: Partial<AuthenticatedRequest> = {}): Request {
  return { body: {}, params: {}, query: {}, ...overrides } as unknown as Request;
}

const next = vi.fn() as unknown as NextFunction;

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("register", () => {
  it("validates the body and responds 201", async () => {
    userSvc.register.mockResolvedValue({ user_id: "u-1" } as never);
    const req = fakeReq({
      body: {
        first_name: "Test",
        last_name: "User",
        username: "testuser",
        email: "test@rvskills.com",
        password: "password123",
      },
    });
    const res = fakeRes();

    await register(req, res, next);

    expect(userSvc.register).toHaveBeenCalledWith({
      first_name: "Test",
      last_name: "User",
      username: "testuser",
      email: "test@rvskills.com",
      password: "password123",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("passes a validation error to next for an invalid email, without calling the service", async () => {
    const req = fakeReq({
      body: {
        first_name: "Test",
        last_name: "User",
        username: "testuser",
        email: "not-an-email",
        password: "password123",
      },
    });
    const res = fakeRes();

    register(req, res, next);
    await flush();

    expect(userSvc.register).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("login", () => {
  it("validates the body and responds with the auth tokens", async () => {
    authSvc.login.mockResolvedValue({ access_token: "tok" } as never);
    const req = fakeReq({ body: { email: "test@rvskills.com", password: "password123" } });
    const res = fakeRes();

    await login(req, res, next);

    expect(authSvc.login).toHaveBeenCalledWith("test@rvskills.com", "password123");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("getProfile", () => {
  it("uses the authenticated user's id", async () => {
    userSvc.getProfile.mockResolvedValue({ user_id: "u-1" } as never);
    const req = fakeReq({
      user: { user_id: "u-1", tenant_id: "t-1", roles: [], permissions: [] },
    });
    const res = fakeRes();

    await getProfile(req as AuthenticatedRequest, res, next);

    expect(userSvc.getProfile).toHaveBeenCalledWith("u-1");
  });
});

describe("refresh", () => {
  it("validates the body and responds with new tokens", async () => {
    authSvc.refreshAccessToken.mockResolvedValue({ access_token: "new-tok" } as never);
    const req = fakeReq({ body: { refresh_token: "old-refresh" } });
    const res = fakeRes();

    await refresh(req, res, next);

    expect(authSvc.refreshAccessToken).toHaveBeenCalledWith("old-refresh");
  });
});

describe("logout", () => {
  it("validates the body and calls the service", async () => {
    authSvc.logout.mockResolvedValue(undefined as never);
    const req = fakeReq({ body: { refresh_token: "some-refresh" } });
    const res = fakeRes();

    await logout(req, res, next);

    expect(authSvc.logout).toHaveBeenCalledWith("some-refresh");
    expect(res.json).toHaveBeenCalledWith({ success: true, message: "Logout successful" });
  });
});

describe("getUsersByIds", () => {
  it("splits, trims and filters the comma-separated ids query param", async () => {
    userSvc.getUsersByIds.mockResolvedValue([] as never);
    const req = fakeReq({ query: { ids: "u-1, u-2,,u-3 " } });
    const res = fakeRes();

    await getUsersByIds(req, res, next);

    expect(userSvc.getUsersByIds).toHaveBeenCalledWith(["u-1", "u-2", "u-3"]);
  });

  it("passes a ValidationError to next, without calling the service, when ids is missing", async () => {
    const req = fakeReq({ query: {} });
    const res = fakeRes();

    getUsersByIds(req, res, next);
    await flush();

    expect(userSvc.getUsersByIds).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it("passes a ValidationError to next when ids is present but blank", async () => {
    const req = fakeReq({ query: { ids: "   " } });
    const res = fakeRes();

    getUsersByIds(req, res, next);
    await flush();

    expect(userSvc.getUsersByIds).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });
});

describe("listUsers", () => {
  it("parses page and pageSize as numbers, and returns total alongside the users", async () => {
    userSvc.listAllUsers.mockResolvedValue({ users: [{ user_id: "u-1" }], total: 1 } as never);
    const req = fakeReq({
      query: { search: "test", page: "2", pageSize: "10", sortBy: "email", sortOrder: "desc" },
    });
    const res = fakeRes();

    await listUsers(req, res, next);

    expect(userSvc.listAllUsers).toHaveBeenCalledWith(
      { search: "test", role_id: undefined, status: undefined },
      { page: 2, pageSize: 10, sortBy: "email", sortOrder: "desc" }
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ user_id: "u-1" }],
      total: 1,
    });
  });

  it("leaves page and pageSize undefined when not given", async () => {
    userSvc.listAllUsers.mockResolvedValue({ users: [], total: 0 } as never);
    const req = fakeReq({ query: {} });
    const res = fakeRes();

    await listUsers(req, res, next);

    expect(userSvc.listAllUsers).toHaveBeenCalledWith(
      { search: undefined, role_id: undefined, status: undefined },
      { page: undefined, pageSize: undefined, sortBy: undefined, sortOrder: undefined }
    );
  });
});

describe("listRoles", () => {
  it("lists all roles", async () => {
    userSvc.listAllRoles.mockResolvedValue([{ role_id: "role-1" }] as never);
    const req = fakeReq();
    const res = fakeRes();

    await listRoles(req, res, next);

    expect(userSvc.listAllRoles).toHaveBeenCalled();
  });
});

describe("assignRole / removeRole", () => {
  it("assignRole passes the user and role ids", async () => {
    userSvc.assignRoleToUser.mockResolvedValue({ user_id: "u-1" } as never);
    const req = fakeReq({ params: { user_id: "u-1" }, body: { role_id: "role-1" } });
    const res = fakeRes();

    await assignRole(req, res, next);

    expect(userSvc.assignRoleToUser).toHaveBeenCalledWith("u-1", "role-1");
  });

  it("removeRole passes the user and role ids from the URL", async () => {
    userSvc.removeRoleFromUser.mockResolvedValue({ user_id: "u-1" } as never);
    const req = fakeReq({ params: { user_id: "u-1", role_id: "role-1" } });
    const res = fakeRes();

    await removeRole(req, res, next);

    expect(userSvc.removeRoleFromUser).toHaveBeenCalledWith("u-1", "role-1");
  });
});

describe("adminCreateUser", () => {
  it("passes the new user's fields through, and responds 201", async () => {
    userSvc.adminCreateUser.mockResolvedValue({
      user: { user_id: "u-1" },
      generated_password: "abc123",
    } as never);
    const req = fakeReq({
      body: {
        first_name: "New",
        last_name: "User",
        username: "newuser",
        email: "new@rvskills.com",
        role_id: "role-student",
      },
    });
    const res = fakeRes();

    await adminCreateUser(req, res, next);

    expect(userSvc.adminCreateUser).toHaveBeenCalledWith({
      first_name: "New",
      last_name: "User",
      username: "newuser",
      email: "new@rvskills.com",
      role_id: "role-student",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("adminBatchCreateStudents", () => {
  it("passes the rows through, and responds 201", async () => {
    userSvc.adminBatchCreateStudents.mockResolvedValue({ created: [], failed: [] } as never);
    const rows = [{ first_name: "A", last_name: "B", username: "ab", email: "a@b.com" }];
    const req = fakeReq({ body: { rows } });
    const res = fakeRes();

    await adminBatchCreateStudents(req, res, next);

    expect(userSvc.adminBatchCreateStudents).toHaveBeenCalledWith(rows);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("adminSetUserStatus", () => {
  it("passes the user id and new status", async () => {
    userSvc.adminSetUserStatus.mockResolvedValue({ user_id: "u-1", status: "inactive" } as never);
    const req = fakeReq({ params: { user_id: "u-1" }, body: { status: "inactive" } });
    const res = fakeRes();

    await adminSetUserStatus(req, res, next);

    expect(userSvc.adminSetUserStatus).toHaveBeenCalledWith("u-1", "inactive");
  });
});

describe("adminResetPassword", () => {
  it("passes the user id", async () => {
    userSvc.adminResetPassword.mockResolvedValue({
      user: { user_id: "u-1" },
      generated_password: "newpass",
    } as never);
    const req = fakeReq({ params: { user_id: "u-1" } });
    const res = fakeRes();

    await adminResetPassword(req, res, next);

    expect(userSvc.adminResetPassword).toHaveBeenCalledWith("u-1");
  });
});