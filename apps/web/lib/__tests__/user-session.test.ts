// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSession, logout } from "../user-session";
import { gatewayFetch, GatewayError } from "../gateway-client";

vi.mock("../gateway-client", async () => {
  const actual = await vi.importActual<typeof import("../gateway-client")>("../gateway-client");
  return { ...actual, gatewayFetch: vi.fn() };
});

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const mockFetch = vi.mocked(gatewayFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSession", () => {
  it("sets the user and stops loading on a successful fetch", async () => {
    mockFetch.mockResolvedValue({ user_id: "u-1", first_name: "Test" } as never);

    const { result } = renderHook(() => useSession());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual({ user_id: "u-1", first_name: "Test" });
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects to /login on a real 401, by default, and stays in a loading state", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Unauthorized", 401));

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));

    // Deliberately stays "loading" while the redirect happens, rather than
    // flashing a logged-out UI first.
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("does not redirect on a 401 when redirectOnUnauthorized is false, and stops loading instead", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Unauthorized", 401));

    const { result } = renderHook(() => useSession({ redirectOnUnauthorized: false }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(push).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it("stops loading without redirecting for a non-401 error", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Server error", 500));

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(push).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it("stops loading without redirecting for a non-GatewayError failure", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(push).not.toHaveBeenCalled();
  });

  it("does not update state after the component has unmounted", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }) as never
    );

    const { result, unmount } = renderHook(() => useSession());
    unmount();

    // Resolve the in-flight fetch only after unmounting. If the hook's
    // cancelled guard didn't work, this would trigger a React state-update-
    // after-unmount warning/error.
    resolveFetch({ user_id: "u-1" });
    await new Promise((r) => setTimeout(r, 0));

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });
});

describe("logout", () => {
  it("posts to /auth/logout", async () => {
    mockFetch.mockResolvedValue(undefined as never);

    await logout();

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/logout", { method: "POST" });
  });
});