import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCourseRatings, getAverageRating, submitRating } from "../rating";
import { gatewayFetch, GatewayError } from "../gateway-client";

vi.mock("../gateway-client", async () => {
  const actual = await vi.importActual<typeof import("../gateway-client")>("../gateway-client");
  return { ...actual, gatewayFetch: vi.fn() };
});
const mockFetch = vi.mocked(gatewayFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCourseRatings / getAverageRating", () => {
  it("gets ratings and the average for the course", async () => {
    mockFetch.mockResolvedValue([] as never);
    await getCourseRatings("course-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/ratings");

    mockFetch.mockResolvedValue({ average: 4, count: 1 } as never);
    await getAverageRating("course-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/ratings/average");
  });
});

describe("submitRating", () => {
  it("returns ok with the new rating on success", async () => {
    mockFetch.mockResolvedValue({ rating_id: "r-1" } as never);

    await expect(submitRating("course-1", { stars: 5 })).resolves.toEqual({
      status: "ok",
      data: { rating_id: "r-1" },
    });
  });

  it("returns not_available for ANY GatewayError, regardless of status code", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Not enrolled", 403));

    await expect(submitRating("course-1", { stars: 5 })).resolves.toEqual({
      status: "not_available",
      message: "Not enrolled",
    });
  });

  it("rethrows a non-GatewayError failure", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    await expect(submitRating("course-1", { stars: 5 })).rejects.toThrow("network down");
  });
});