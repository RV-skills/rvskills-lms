import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  adminCreateUser,
  adminBatchCreateStudents,
  listAllUsers,
  listAllRoles,
  assignRole,
  removeRole,
  listCoursesForAdmin,
  publishCourse,
  unpublishCourse,
  listCourseFaculty,
  assignCourseFaculty,
  removeCourseFaculty,
  getPlatformStats,
  setUserStatus,
  resetUserPassword,
  exportUsersToCsv,
  type AdminUser,
} from "../admin";
import { gatewayFetch, gatewayFetchRaw } from "../gateway-client";

vi.mock("../gateway-client", () => ({
  gatewayFetch: vi.fn(),
  gatewayFetchRaw: vi.fn(),
}));

const mockFetch = vi.mocked(gatewayFetch);
const mockFetchRaw = vi.mocked(gatewayFetchRaw);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listAllUsers", () => {
  it("only sets query params that are actually given", async () => {
    mockFetchRaw.mockResolvedValue({ success: true, data: [], total: 0 } as never);

    await listAllUsers({ search: "test" });

    expect(mockFetchRaw).toHaveBeenCalledWith("/api/v1/users/all?search=test");
  });

  it("converts page and pageSize to strings in the query", async () => {
    mockFetchRaw.mockResolvedValue({ success: true, data: [], total: 0 } as never);

    await listAllUsers({ page: 2, pageSize: 10 });

    const [url] = mockFetchRaw.mock.calls[0];
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("page")).toBe("2");
    expect(params.get("pageSize")).toBe("10");
  });

  it("requests the bare path, with no '?', when no filters are given", async () => {
    mockFetchRaw.mockResolvedValue({ success: true, data: [], total: 0 } as never);

    await listAllUsers();

    expect(mockFetchRaw).toHaveBeenCalledWith("/api/v1/users/all");
  });

  it("defaults users to an empty array and total to 0 when the response omits them", async () => {
    mockFetchRaw.mockResolvedValue({ success: true } as never);

    await expect(listAllUsers()).resolves.toEqual({ users: [], total: 0 });
  });

  it("returns the real users and total when present", async () => {
    mockFetchRaw.mockResolvedValue({
      success: true,
      data: [{ user_id: "u-1" }],
      total: 5,
    } as never);

    await expect(listAllUsers()).resolves.toEqual({
      users: [{ user_id: "u-1" }],
      total: 5,
    });
  });
});

describe("pass-through requests, confirming the right endpoint and method", () => {
  it("adminCreateUser posts to /users with the given fields", async () => {
    mockFetch.mockResolvedValue({} as never);
    const data = { first_name: "A", last_name: "B", username: "ab", email: "a@b.com", role_id: "role-1" };

    await adminCreateUser(data);

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("adminBatchCreateStudents wraps the rows in an object", async () => {
    mockFetch.mockResolvedValue({} as never);
    const rows = [{ first_name: "A", last_name: "B", username: "ab", email: "a@b.com" }];

    await adminBatchCreateStudents(rows);

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/users/batch", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  });

  it("listAllRoles gets /users/roles", async () => {
    mockFetch.mockResolvedValue([] as never);
    await listAllRoles();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/users/roles");
  });

  it("assignRole posts the role_id", async () => {
    mockFetch.mockResolvedValue(undefined as never);
    await assignRole("u-1", "role-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/users/u-1/roles", {
      method: "POST",
      body: JSON.stringify({ role_id: "role-1" }),
    });
  });

  it("removeRole deletes by user and role id", async () => {
    mockFetch.mockResolvedValue(undefined as never);
    await removeRole("u-1", "role-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/users/u-1/roles/role-1", { method: "DELETE" });
  });

  it("listCoursesForAdmin gets the admin course list", async () => {
    mockFetch.mockResolvedValue([] as never);
    await listCoursesForAdmin();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/admin/all");
  });

  it("publishCourse / unpublishCourse PATCH the right endpoint", async () => {
    mockFetch.mockResolvedValue(undefined as never);
    await publishCourse("course-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/publish", { method: "PATCH" });

    await unpublishCourse("course-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/unpublish", { method: "PATCH" });
  });

  it("listCourseFaculty / assignCourseFaculty / removeCourseFaculty use the right shape", async () => {
    mockFetch.mockResolvedValue([] as never);
    await listCourseFaculty("course-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/faculty");

    await assignCourseFaculty("course-1", "f-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/faculty", {
      method: "POST",
      body: JSON.stringify({ faculty_id: "f-1" }),
    });

    await removeCourseFaculty("course-1", "f-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/faculty/f-1", { method: "DELETE" });
  });

  it("getPlatformStats gets /admin/stats", async () => {
    mockFetch.mockResolvedValue({} as never);
    await getPlatformStats();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/admin/stats");
  });

  it("setUserStatus PATCHes the new status", async () => {
    mockFetch.mockResolvedValue(undefined as never);
    await setUserStatus("u-1", "inactive");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/users/u-1/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "inactive" }),
    });
  });

  it("resetUserPassword POSTs to the reset-password endpoint", async () => {
    mockFetch.mockResolvedValue({} as never);
    await resetUserPassword("u-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/users/u-1/reset-password", { method: "POST" });
  });
});

describe("exportUsersToCsv", () => {
  function fakeUser(overrides: Partial<AdminUser> = {}): AdminUser {
    return {
      user_id: "u-1",
      first_name: "Test",
      last_name: "User",
      username: "testuser",
      email: "test@rvskills.com",
      status: "active",
      user_roles: [{ role: { role_id: "role-1", role_name: "Student" } }],
      ...overrides,
    };
  }

  it("builds a header row plus one row per user, semicolon-joining multiple roles", () => {
    let capturedCsv = "";
    class FakeBlob {
      constructor(parts: string[]) {
        capturedCsv = parts[0];
      }
    }
    vi.stubGlobal("Blob", FakeBlob);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:fake"), revokeObjectURL: vi.fn() });
    const fakeAnchor = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("document", { createElement: vi.fn(() => fakeAnchor) });

    const users = [
      fakeUser({
        user_roles: [
          { role: { role_id: "role-1", role_name: "Faculty" } },
          { role: { role_id: "role-2", role_name: "Student" } },
        ],
      }),
    ];

    exportUsersToCsv(users);

    expect(capturedCsv).toBe(
      "first_name,last_name,username,email,status,roles\nTest,User,testuser,test@rvskills.com,active,Faculty;Student"
    );

    vi.unstubAllGlobals();
  });

  it("triggers a download named users.csv and cleans up the object URL afterward", () => {
    vi.stubGlobal("Blob", vi.fn());
    const createObjectURL = vi.fn(() => "blob:fake-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const fakeAnchor = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("document", { createElement: vi.fn(() => fakeAnchor) });

    exportUsersToCsv([fakeUser()]);

    expect(fakeAnchor.download).toBe("users.csv");
    expect(fakeAnchor.href).toBe("blob:fake-url");
    expect(fakeAnchor.click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");

    vi.unstubAllGlobals();
  });
});