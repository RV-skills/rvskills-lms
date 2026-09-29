import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadGatewayError,
  NotFoundError,
} from "@rv-lms/shared-utils";
import {
  listAllUsers,
  listAllRoles,
  assignRoleToUser,
  getUsersByIds,
  adminCreateUser,
  setUserStatus,
  resetUserPassword,
} from "../users.service";
import { fetchWithTimeout } from "../../utils/http-client.util";

vi.mock("../../utils/http-client.util", async () => {
  const actual = await vi.importActual<typeof import("../../utils/http-client.util")>(
    "../../utils/http-client.util"
  );
  return { ...actual, fetchWithTimeout: vi.fn() };
});

const mockFetch = vi.mocked(fetchWithTimeout);

function fakeResponse(status: number, body: unknown = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("listAllUsers", () => {
  it("keeps the specific session-expired message for a real 401", async () => {
    mockFetch.mockResolvedValue(fakeResponse(401));

    await expect(listAllUsers("token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("keeps the specific permission message for a real 403", async () => {
    mockFetch.mockResolvedValue(fakeResponse(403));

    await expect(listAllUsers("token")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("now correctly passes through a real 404, instead of flattening it to 502", async () => {
    mockFetch.mockResolvedValue(fakeResponse(404, { message: "Tenant not found" }));

    const result = listAllUsers("token");

    await expect(result).rejects.toBeInstanceOf(NotFoundError);
    await expect(result).rejects.not.toBeInstanceOf(BadGatewayError);
  });

  it("throws BadGatewayError for a real outage", async () => {
    mockFetch.mockResolvedValue(fakeResponse(503));

    await expect(listAllUsers("token")).rejects.toBeInstanceOf(BadGatewayError);
  });
});

describe("listAllRoles", () => {
  it("keeps the specific 401/403 messages", async () => {
    mockFetch.mockResolvedValue(fakeResponse(401));
    await expect(listAllRoles("token")).rejects.toBeInstanceOf(UnauthorizedError);

    mockFetch.mockResolvedValue(fakeResponse(403));
    await expect(listAllRoles("token")).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("assignRoleToUser", () => {
  it("passes through a real 404 (user not found) instead of a generic 502", async () => {
    mockFetch.mockResolvedValue(fakeResponse(404, { message: "User not found" }));

    const result = assignRoleToUser("user-1", "role-1", "token");

    await expect(result).rejects.toBeInstanceOf(NotFoundError);
    await expect(result).rejects.not.toBeInstanceOf(BadGatewayError);
  });
});

describe("getUsersByIds", () => {
  it("returns an empty list without making a request when given no ids", async () => {
    await expect(getUsersByIds([], "token")).resolves.toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("de-duplicates ids before requesting", async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { data: [] }));

    await getUsersByIds(["u-1", "u-1", "u-2"], "token");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("ids=u-1,u-2");
  });
});

describe("adminCreateUser", () => {
  it("keeps the specific 'already in use' message for a real 409", async () => {
    mockFetch.mockResolvedValue(
      fakeResponse(409, { message: "That email or username is already in use." })
    );

    await expect(
      adminCreateUser(
        { first_name: "A", last_name: "B", username: "ab", email: "a@b.com", role_id: "role-1" },
        "token"
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("passes through a real 400 (validation) instead of a generic 502", async () => {
    mockFetch.mockResolvedValue(fakeResponse(400, { message: "Invalid email format" }));

    const result = adminCreateUser(
      { first_name: "A", last_name: "B", username: "ab", email: "not-an-email", role_id: "role-1" },
      "token"
    );

    await expect(result).rejects.not.toBeInstanceOf(BadGatewayError);
    await expect(result).rejects.not.toBeInstanceOf(ConflictError);
  });
});

describe("setUserStatus", () => {
  it("passes through a real 404 (user not found) instead of a generic 502", async () => {
    mockFetch.mockResolvedValue(fakeResponse(404, { message: "User not found" }));

    const result = setUserStatus("user-1", "inactive", "token");

    await expect(result).rejects.toBeInstanceOf(NotFoundError);
    await expect(result).rejects.not.toBeInstanceOf(BadGatewayError);
  });
});

describe("resetUserPassword", () => {
  it("passes through a real 404 (user not found) instead of a generic 502", async () => {
    mockFetch.mockResolvedValue(fakeResponse(404, { message: "User not found" }));

    const result = resetUserPassword("user-1", "token");

    await expect(result).rejects.toBeInstanceOf(NotFoundError);
    await expect(result).rejects.not.toBeInstanceOf(BadGatewayError);
  });
});