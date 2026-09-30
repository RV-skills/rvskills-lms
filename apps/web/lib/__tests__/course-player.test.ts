import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCoursePlayerData, markLessonComplete } from "../course-player";
import { gatewayFetch, GatewayError } from "../gateway-client";

vi.mock("../gateway-client", async () => {
  const actual = await vi.importActual<typeof import("../gateway-client")>("../gateway-client");
  return { ...actual, gatewayFetch: vi.fn() };
});
const mockFetch = vi.mocked(gatewayFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCoursePlayerData", () => {
  it("returns ok with the player data on success", async () => {
    mockFetch.mockResolvedValue({ courseTitle: "Course 1" } as never);

    await expect(getCoursePlayerData("course-1")).resolves.toEqual({
      status: "ok",
      data: { courseTitle: "Course 1" },
    });
  });

  it("returns no_lessons for a 404 whose message mentions no lessons", async () => {
    mockFetch.mockRejectedValue(new GatewayError("This course has no lessons yet", 404));

    await expect(getCoursePlayerData("course-1")).resolves.toEqual({ status: "no_lessons" });
  });

  it("matches the no-lessons message case-insensitively", async () => {
    mockFetch.mockRejectedValue(new GatewayError("NO LESSONS available", 404));

    await expect(getCoursePlayerData("course-1")).resolves.toEqual({ status: "no_lessons" });
  });

  it("returns not_found for any other 404", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Course not found", 404));

    await expect(getCoursePlayerData("missing")).resolves.toEqual({ status: "not_found" });
  });

  it("returns not_enrolled for a real 400", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Not enrolled", 400));

    await expect(getCoursePlayerData("course-1")).resolves.toEqual({ status: "not_enrolled" });
  });

  it("rethrows any other GatewayError status", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Server error", 500));

    await expect(getCoursePlayerData("course-1")).rejects.toMatchObject({ statusCode: 500 });
  });

  it("rethrows a non-GatewayError failure", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    await expect(getCoursePlayerData("course-1")).rejects.toThrow("network down");
  });
});

describe("markLessonComplete", () => {
  it("posts to the lesson's complete endpoint", async () => {
    mockFetch.mockResolvedValue(undefined as never);

    await markLessonComplete("course-1", "l-1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/courses/course-1/lessons/l-1/complete",
      { method: "POST" }
    );
  });
});