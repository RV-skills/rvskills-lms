import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  submitRating,
  updateRating,
  listCourseRatings,
  getAverageRating,
} from "../course-rating.controller";
import { courseRatingService } from "../../services/course-rating.service";

vi.mock("../../services/course-rating.service", () => ({
  courseRatingService: {
    submitRating: vi.fn(),
    updateRating: vi.fn(),
    getCourseRatings: vi.fn(),
    getAverageRating: vi.fn(),
  },
}));

const svc = vi.mocked(courseRatingService);

const OWNER = "student-1";
const DEFAULT_TENANT = "rv-skills-tenant";

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

function fakeReq(overrides: Partial<AuthenticatedRequest> = {}): Request {
  return {
    body: {},
    params: {},
    user: { user_id: OWNER, tenant_id: DEFAULT_TENANT, roles: ["Student"], permissions: [] },
    ...overrides,
  } as unknown as Request;
}

const next = vi.fn() as unknown as NextFunction;

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("submitRating", () => {
  it("parses stars and comment, calls the service, and responds 201", async () => {
    svc.submitRating.mockResolvedValue({ rating_id: "r-1" } as never);
    const req = fakeReq({
      params: { enrollment_id: "enr-1" },
      body: { stars: 5, comment: "Great course" },
    });
    const res = fakeRes();

    await submitRating(req, res, next);

    expect(svc.submitRating).toHaveBeenCalledWith("enr-1", OWNER, 5, "Great course");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Rating submitted successfully",
      data: { rating_id: "r-1" },
    });
  });

  it("allows submitting with no comment", async () => {
    svc.submitRating.mockResolvedValue({ rating_id: "r-1" } as never);
    const req = fakeReq({ params: { enrollment_id: "enr-1" }, body: { stars: 4 } });
    const res = fakeRes();

    await submitRating(req, res, next);

    expect(svc.submitRating).toHaveBeenCalledWith("enr-1", OWNER, 4, undefined);
  });

  it("passes a validation error to next for stars out of range, without calling the service", async () => {
    const req = fakeReq({ params: { enrollment_id: "enr-1" }, body: { stars: 6 } });
    const res = fakeRes();

    submitRating(req, res, next);
    await flush();

    expect(svc.submitRating).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("updateRating", () => {
  it("passes only the given fields through to the service", async () => {
    svc.updateRating.mockResolvedValue({ rating_id: "r-1", stars: 3 } as never);
    const req = fakeReq({ params: { enrollment_id: "enr-1" }, body: { stars: 3 } });
    const res = fakeRes();

    await updateRating(req, res, next);

    expect(svc.updateRating).toHaveBeenCalledWith("enr-1", OWNER, { stars: 3 });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("listCourseRatings", () => {
  it("lists ratings for the course in the default tenant, with no auth required", async () => {
    svc.getCourseRatings.mockResolvedValue([{ rating_id: "r-1" }] as never);
    const req = fakeReq({ params: { course_id: "course-1" }, user: undefined });
    const res = fakeRes();

    await listCourseRatings(req, res, next);

    expect(svc.getCourseRatings).toHaveBeenCalledWith("course-1", DEFAULT_TENANT);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ rating_id: "r-1" }] });
  });
});

describe("getAverageRating", () => {
  it("returns the average for the course", async () => {
    svc.getAverageRating.mockResolvedValue({ average: 4.5, count: 2 } as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await getAverageRating(req, res, next);

    expect(svc.getAverageRating).toHaveBeenCalledWith("course-1");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { average: 4.5, count: 2 },
    });
  });
});