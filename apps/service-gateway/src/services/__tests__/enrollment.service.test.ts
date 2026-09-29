import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConflictError, NotFoundError, BadGatewayError, ForbiddenError } from "@rv-lms/shared-utils";
import {
  enrollInCourse,
  getMyEnrollments,
  submitRating,
  updateRating,
  markLessonComplete,
} from "../enrollment.service";
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

describe("enrollInCourse", () => {
  it("keeps the specific 'already enrolled' message for a real 409", async () => {
    mockFetch.mockResolvedValue(fakeResponse(409, { message: "You are already enrolled in this course" }));

    await expect(enrollInCourse("course-1", "token")).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws BadGatewayError, not a 502-flattened generic error, for a real outage", async () => {
    mockFetch.mockResolvedValue(fakeResponse(503));

    await expect(enrollInCourse("course-1", "token")).rejects.toBeInstanceOf(BadGatewayError);
  });

  it("now correctly passes through a real 403, instead of flattening it to 502", async () => {
    mockFetch.mockResolvedValue(fakeResponse(403, { message: "Course is not open for enrollment" }));

    const result = enrollInCourse("course-1", "token");

    await expect(result).rejects.toBeInstanceOf(ForbiddenError);
    await expect(result).rejects.not.toBeInstanceOf(BadGatewayError);
  });
});

describe("getMyEnrollments", () => {
  it("passes through a real status code instead of always flattening to 502", async () => {
    mockFetch.mockResolvedValue(fakeResponse(401));

    const result = getMyEnrollments("bad-token");

    await expect(result).rejects.not.toBeInstanceOf(BadGatewayError);
  });

  it("throws BadGatewayError for a real outage", async () => {
    mockFetch.mockResolvedValue(fakeResponse(503));

    await expect(getMyEnrollments("token")).rejects.toBeInstanceOf(BadGatewayError);
  });
});

describe("submitRating: keeps the specific 409, correctly passes through everything else", () => {
  it("keeps the specific 'already rated' message for a real 409", async () => {
    mockFetch
      .mockResolvedValueOnce(
        fakeResponse(200, { data: [{ enrollment_id: "enr-1", course_id: "course-1" }] })
      )
      .mockResolvedValueOnce(fakeResponse(409, { message: "You have already rated this course" }));

    await expect(
      submitRating("course-1", { stars: 5 }, "token")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("passes through a real 403 (e.g. enrollment dropped) instead of a generic 502", async () => {
    mockFetch
      .mockResolvedValueOnce(
        fakeResponse(200, { data: [{ enrollment_id: "enr-1", course_id: "course-1" }] })
      )
      .mockResolvedValueOnce(fakeResponse(403, { message: "This enrollment is not active" }));

    const result = submitRating("course-1", { stars: 5 }, "token");

    await expect(result).rejects.toBeInstanceOf(ForbiddenError);
    await expect(result).rejects.not.toBeInstanceOf(BadGatewayError);
  });
});

describe("updateRating: keeps the specific 404, correctly passes through everything else", () => {
  it("keeps the specific 'rating not found' message for a real 404", async () => {
    mockFetch
      .mockResolvedValueOnce(
        fakeResponse(200, { data: [{ enrollment_id: "enr-1", course_id: "course-1" }] })
      )
      .mockResolvedValueOnce(fakeResponse(404, { message: "Rating not found" }));

    await expect(
      updateRating("course-1", { stars: 3 }, "token")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("markLessonComplete", () => {
  it("passes through a real 403 instead of a generic 502", async () => {
    mockFetch
      .mockResolvedValueOnce(
        fakeResponse(200, { data: [{ enrollment_id: "enr-1", course_id: "course-1" }] })
      )
      .mockResolvedValueOnce(fakeResponse(403, { message: "This enrollment is not active" }));

    const result = markLessonComplete("course-1", "lesson-1", "token");

    await expect(result).rejects.toBeInstanceOf(ForbiddenError);
    await expect(result).rejects.not.toBeInstanceOf(BadGatewayError);
  });
});