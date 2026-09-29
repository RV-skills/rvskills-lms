import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  meController,
  listAllUsersController,
  listAllRolesController,
  assignRoleController,
  removeRoleController,
  adminCreateUserController,
  adminBatchCreateStudentsController,
  setUserStatusController,
  resetUserPasswordController,
} from "../users.controller";
import {
  listAllUsers,
  listAllRoles,
  assignRoleToUser,
  removeRoleFromUser,
  adminCreateUser,
  adminBatchCreateStudents,
  setUserStatus,
  resetUserPassword,
} from "../../services/users.service";

vi.mock("../../services/users.service", () => ({
  listAllUsers: vi.fn(),
  listAllRoles: vi.fn(),
  assignRoleToUser: vi.fn(),
  removeRoleFromUser: vi.fn(),
  adminCreateUser: vi.fn(),
  adminBatchCreateStudents: vi.fn(),
  setUserStatus: vi.fn(),
  resetUserPassword: vi.fn(),
}));

const TOKEN = "Bearer test-token";
const ADMIN_USER = { user_id: "a-1", tenant_id: "t-1", roles: ["Admin"], permissions: [] };

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

function fakeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    body: {},
    params: {},
    query: {},
    accessToken: TOKEN,
    user: ADMIN_USER,
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

const next = vi.fn() as unknown as NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("meController", () => {
  it("returns the authenticated user directly, synchronously", () => {
    const req = fakeReq();
    const res = fakeRes();

    meController(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: ADMIN_USER });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("listAllUsersController", () => {
  it("parses page and pageSize as numbers, and returns total alongside the users", async () => {
    vi.mocked(listAllUsers).mockResolvedValue({
      users: [{ user_id: "u-1" }],
      total: 1,
    } as never);
    const req = fakeReq({
      query: { search: "test", page: "2", pageSize: "10", sortBy: "email", sortOrder: "desc" },
    });
    const res = fakeRes();

    await listAllUsersController(req, res, next);

    expect(listAllUsers).toHaveBeenCalledWith(
      TOKEN,
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
    vi.mocked(listAllUsers).mockResolvedValue({ users: [], total: 0 } as never);
    const req = fakeReq({ query: {} });
    const res = fakeRes();

    await listAllUsersController(req, res, next);

    expect(listAllUsers).toHaveBeenCalledWith(
      TOKEN,
      { search: undefined, role_id: undefined, status: undefined },
      { page: undefined, pageSize: undefined, sortBy: undefined, sortOrder: undefined }
    );
  });
});

describe("listAllRolesController", () => {
  it("passes the caller's token", async () => {
    vi.mocked(listAllRoles).mockResolvedValue([{ role_id: "role-1" }] as never);
    const req = fakeReq();
    const res = fakeRes();

    await listAllRolesController(req, res, next);

    expect(listAllRoles).toHaveBeenCalledWith(TOKEN);
  });
});

describe("assignRoleController / removeRoleController", () => {
  it("assignRoleController passes the user id, role id from the body, and token, and responds success with no data", async () => {
    vi.mocked(assignRoleToUser).mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { user_id: "u-1" }, body: { role_id: "role-1" } });
    const res = fakeRes();

    await assignRoleController(req, res, next);

    expect(assignRoleToUser).toHaveBeenCalledWith("u-1", "role-1", TOKEN);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("removeRoleController passes the user and role ids from the URL, and token", async () => {
    vi.mocked(removeRoleFromUser).mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { user_id: "u-1", role_id: "role-1" } });
    const res = fakeRes();

    await removeRoleController(req, res, next);

    expect(removeRoleFromUser).toHaveBeenCalledWith("u-1", "role-1", TOKEN);
  });
});

describe("adminCreateUserController", () => {
  it("passes the body and the caller's token, and responds 201", async () => {
    vi.mocked(adminCreateUser).mockResolvedValue({
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

    await adminCreateUserController(req, res, next);

    expect(adminCreateUser).toHaveBeenCalledWith(req.body, TOKEN);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("adminBatchCreateStudentsController", () => {
  it("destructures rows from the body, passes the token, and responds 201", async () => {
    vi.mocked(adminBatchCreateStudents).mockResolvedValue({ created: [], failed: [] } as never);
    const rows = [{ first_name: "A", last_name: "B", username: "ab", email: "a@b.com" }];
    const req = fakeReq({ body: { rows } });
    const res = fakeRes();

    await adminBatchCreateStudentsController(req, res, next);

    expect(adminBatchCreateStudents).toHaveBeenCalledWith(rows, TOKEN);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("setUserStatusController", () => {
  it("passes the user id, new status, and token", async () => {
    vi.mocked(setUserStatus).mockResolvedValue({ user_id: "u-1", status: "inactive" } as never);
    const req = fakeReq({ params: { user_id: "u-1" }, body: { status: "inactive" } });
    const res = fakeRes();

    await setUserStatusController(req, res, next);

    expect(setUserStatus).toHaveBeenCalledWith("u-1", "inactive", TOKEN);
  });
});

describe("resetUserPasswordController", () => {
  it("passes the user id and token", async () => {
    vi.mocked(resetUserPassword).mockResolvedValue({
      user: { user_id: "u-1" },
      generated_password: "newpass",
    } as never);
    const req = fakeReq({ params: { user_id: "u-1" } });
    const res = fakeRes();

    await resetUserPasswordController(req, res, next);

    expect(resetUserPassword).toHaveBeenCalledWith("u-1", TOKEN);
  });
});