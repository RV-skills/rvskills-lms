import { describe, expect, it, vi } from "vitest";
import { UnauthorizedError, BadGatewayError, ConflictError } from "@rv-lms/shared-utils";
import { login, refreshTokens, verifyAccessToken, register } from "../auth.service";
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

describe("login: distinguishes bad credentials from a real outage", () => {
  it("throws UnauthorizedError for a real 401 (wrong credentials)", async () => {
    mockFetch.mockResolvedValue(fakeResponse(401));

    await expect(login("a@b.com", "wrong")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws BadGatewayError, not 'invalid credentials', when service-auth is down", async () => {
    mockFetch.mockResolvedValue(fakeResponse(503));

    const result = login("a@b.com", "correct-but-service-down");

    await expect(result).rejects.toBeInstanceOf(BadGatewayError);
    await expect(result).rejects.not.toBeInstanceOf(UnauthorizedError);
  });
});

describe("refreshTokens: distinguishes an invalid token from a real outage", () => {
  it("throws UnauthorizedError for a real 401 (bad refresh token)", async () => {
    mockFetch.mockResolvedValue(fakeResponse(401));

    await expect(refreshTokens("bad-token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws BadGatewayError, not 'session expired', when service-auth is down", async () => {
    mockFetch.mockResolvedValue(fakeResponse(503));

    const result = refreshTokens("a-token-that-might-be-fine");

    await expect(result).rejects.toBeInstanceOf(BadGatewayError);
    await expect(result).rejects.not.toBeInstanceOf(UnauthorizedError);
  });
});

describe("verifyAccessToken: distinguishes an invalid token from a real outage", () => {
  it("throws UnauthorizedError for a real 401", async () => {
    mockFetch.mockResolvedValue(fakeResponse(401));

    await expect(verifyAccessToken("bad-token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws BadGatewayError when service-auth is down", async () => {
    mockFetch.mockResolvedValue(fakeResponse(503));

    await expect(verifyAccessToken("a-token")).rejects.toBeInstanceOf(BadGatewayError);
  });
});

describe("register: distinguishes a real duplicate from a real outage", () => {
  it("throws ConflictError for a real 409 (email or username taken)", async () => {
    mockFetch.mockResolvedValue(fakeResponse(409, { message: "Email already registered" }));

    const result = register({
      email: "taken@example.com",
      password: "x",
      first_name: "A",
      last_name: "B",
      username: "ab",
    });

    await expect(result).rejects.toBeInstanceOf(ConflictError);
    await expect(result).rejects.toThrow("Email already registered");
  });

  it("throws BadGatewayError, not 'registration failed', when service-auth is down", async () => {
    mockFetch.mockResolvedValue(fakeResponse(503));

    const result = register({
      email: "new@example.com",
      password: "x",
      first_name: "A",
      last_name: "B",
      username: "ab",
    });

    await expect(result).rejects.toBeInstanceOf(BadGatewayError);
    await expect(result).rejects.not.toBeInstanceOf(ConflictError);
  });
});