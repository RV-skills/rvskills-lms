import { describe, expect, it, vi, beforeEach } from "vitest";
import { getMyLearning } from "../my-learning";
import { gatewayFetch } from "../gateway-client";

vi.mock("../gateway-client", () => ({ gatewayFetch: vi.fn() }));
const mockFetch = vi.mocked(gatewayFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getMyLearning", () => {
  it("gets the dashboard data", async () => {
    mockFetch.mockResolvedValue({ inProgress: [], completed: [] } as never);

    await expect(getMyLearning()).resolves.toEqual({ inProgress: [], completed: [] });
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/dashboard/my-learning");
  });
});