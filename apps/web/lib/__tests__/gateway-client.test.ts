import { describe, expect, it, vi, beforeEach } from "vitest";
import { gatewayFetch, gatewayFetchRaw, GatewayError } from "../gateway-client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function fakeResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("gatewayFetch", () => {
  it("returns the data field on a successful response", async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { success: true, data: { id: "1" } }));

    await expect(gatewayFetch("/api/v1/courses")).resolves.toEqual({ id: "1" });
  });

  it("always sends credentials, no-store caching, and a JSON content type", async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { success: true, data: {} }));

    await gatewayFetch("/api/v1/courses");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3005/api/v1/courses",
      expect.objectContaining({
        credentials: "include",
        cache: "no-store",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  it("lets a caller override headers without losing the default content type", async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { success: true, data: {} }));

    await gatewayFetch("/api/v1/courses", { headers: { "X-Custom": "yes" } });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers).toEqual({
      "Content-Type": "application/json",
      "X-Custom": "yes",
    });
  });

  it.each([
    ["a non-ok HTTP status", fakeResponse(404, { success: true, message: "Not found" })],
    ["a 200 response whose body says success: false", fakeResponse(200, { success: false, message: "Rejected" })],
  ])("throws GatewayError for %s", async (_label, response) => {
    mockFetch.mockResolvedValue(response);

    await expect(gatewayFetch("/api/v1/courses")).rejects.toBeInstanceOf(GatewayError);
  });

  it("carries the real status code and message on the thrown error", async () => {
    mockFetch.mockResolvedValue(fakeResponse(403, { success: false, message: "Forbidden" }));

    await expect(gatewayFetch("/api/v1/courses")).rejects.toMatchObject({
      statusCode: 403,
      message: "Forbidden",
    });
  });

  it("falls back to a generic message when the body has none", async () => {
    mockFetch.mockResolvedValue(fakeResponse(500, { success: false }));

    await expect(gatewayFetch("/api/v1/courses")).rejects.toThrow("Something went wrong");
  });

  it("carries field-level validation errors through", async () => {
    mockFetch.mockResolvedValue(
      fakeResponse(400, {
        success: false,
        message: "Validation failed",
        errors: [{ field: "email", message: "Invalid email" }],
      })
    );

    await expect(gatewayFetch("/api/v1/courses")).rejects.toMatchObject({
      fieldErrors: [{ field: "email", message: "Invalid email" }],
    });
  });
});

describe("gatewayFetchRaw", () => {
  it("returns the whole response body, including fields gatewayFetch discards", async () => {
    mockFetch.mockResolvedValue(
      fakeResponse(200, { success: true, data: [{ id: "1" }], total: 42 })
    );

    await expect(gatewayFetchRaw("/api/v1/users/all")).resolves.toEqual({
      success: true,
      data: [{ id: "1" }],
      total: 42,
    });
  });

  it("throws GatewayError under the same rules as gatewayFetch", async () => {
    mockFetch.mockResolvedValue(fakeResponse(401, { success: false, message: "Session expired" }));

    await expect(gatewayFetchRaw("/api/v1/users/all")).rejects.toBeInstanceOf(GatewayError);
  });
});