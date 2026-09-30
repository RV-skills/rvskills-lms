import { describe, expect, it, vi, beforeEach } from "vitest";
import { enrollInCourse, getMyEnrollments } from "../enrollment";
import { gatewayFetch, GatewayError } from "../gateway-client";

vi.mock("../gateway-client", async () => {
  const actual = await vi.importActual<typeof import("../gateway-client")>("../gateway-client");
  return { ...actual, gatewayFetch: vi.fn() };
});
const mockFetch = vi.mocked(gatewayFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("enrollInCourse", () => {
  it("returns ok with the enrollment on success", async () => {
    mockFetch.mockResolvedValue({ enrollment_id: "enr-1" } as never);

    await expect(enrollInCourse("course-1")).resolves.toEqual({
      status: "ok",
      data: { enrollment_id: "enr-1" },
    });
  });

  it("returns already_enrolled for a real 409", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Already enrolled", 409));

    await expect(enrollInCourse("course-1")).resolves.toEqual({ status: "already_enrolled" });
  });

  it("returns not_available, with the error's message, for a real 400", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Course is full", 400));

    await expect(enrollInCourse("course-1")).resolves.toEqual({
      status: "not_available",
      message: "Course is full",
    });
  });

  it("rethrows any other GatewayError status", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Server error", 500));

    await expect(enrollInCourse("course-1")).rejects.toMatchObject({ statusCode: 500 });
  });

  it("rethrows a non-GatewayError failure", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    await expect(enrollInCourse("course-1")).rejects.toThrow("network down");
  });
});

describe("getMyEnrollments", () => {
  it("gets the student's own enrollments", async () => {
    mockFetch.mockResolvedValue([{ enrollment_id: "enr-1" }] as never);
    await getMyEnrollments();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/enrollments/my-enrollments");
  });
});