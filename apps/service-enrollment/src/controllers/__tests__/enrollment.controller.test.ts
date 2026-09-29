import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  enrollCourse,
  bulkEnrollCourse,
  dropCourse,
  getEnrollment,
  getMyEnrollments,
  getCompletedLessons,
  countAllEnrollments,
  countEnrollmentsByCourse,
} from "../enrollment.controller";
import { enrollmentService } from "../../services/enrollment.service";

vi.mock("../../services/enrollment.service", () => ({
  enrollmentService: {
    enrollCourse: vi.fn(),
    bulkEnrollCourse: vi.fn(),
    dropCourse: vi.fn(),
    getEnrollment: vi.fn(),
    getStudentEnrollments: vi.fn(),
    getCompletedLessonIds: vi.fn(),
    countAllEnrollments: vi.fn(),
    countEnrollmentsByCourse: vi.fn(),
  },
}));

const svc = vi.mocked(enrollmentService);

const OWNER = "student-1";
const DEFAULT_TENANT = "rv-skills-tenant";

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";

function fakeReq(overrides: Partial<AuthenticatedRequest> = {}): Request {
  return {
    body: {},
    params: {},
    user: { user_id: OWNER, tenant_id: DEFAULT_TENANT, roles: ["Student"], permissions: [] },
    ...overrides,
  } as unknown as Request;
}

const next = vi.fn() as unknown as NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("enrollCourse", () => {
  it("parses course_id, calls the service with the authenticated user, and responds 201", async () => {
    svc.enrollCourse.mockResolvedValue({ enrollment_id: "enr-1" } as never);
    const req = fakeReq({ body: { course_id: "11111111-1111-1111-1111-111111111111" } });
    const res = fakeRes();

    await enrollCourse(req, res, next);

    expect(svc.enrollCourse).toHaveBeenCalledWith(
      OWNER,
      "11111111-1111-1111-1111-111111111111",
      DEFAULT_TENANT
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Enrolled successfully",
      data: { enrollment_id: "enr-1" },
    });
  });

  it("passes a validation error to next, without calling the service, for an invalid course_id", async () => {
    const req = fakeReq({ body: { course_id: "not-a-uuid" } });
    const res = fakeRes();

    await enrollCourse(req, res, next);

    expect(svc.enrollCourse).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("passes a service error to next instead of throwing", async () => {
    svc.enrollCourse.mockRejectedValue(new Error("already enrolled"));
    const req = fakeReq({ body: { course_id: "11111111-1111-1111-1111-111111111111" } });
    const res = fakeRes();

    enrollCourse(req, res, next);
    // catchAsync's wrapper is not itself async and does not return the
    // inner promise, so awaiting the call directly races ahead of its
    // internal .catch(next). Flushing the microtask queue lets that
    // handler actually run before we assert on it.
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("bulkEnrollCourse", () => {
  it("attaches the default tenant to every student row and responds 201", async () => {
    svc.bulkEnrollCourse.mockResolvedValue({ requested: 1, enrolled: 1, skipped: 0 } as never);
    const req = fakeReq({
      body: {
        course_id: "11111111-1111-1111-1111-111111111111",
        students: [{ student_id: "22222222-2222-2222-2222-222222222222" }],
      },
    });
    const res = fakeRes();

    await bulkEnrollCourse(req, res, next);

    expect(svc.bulkEnrollCourse).toHaveBeenCalledWith(
      [{ student_id: "22222222-2222-2222-2222-222222222222", tenant_id: DEFAULT_TENANT }],
      "11111111-1111-1111-1111-111111111111"
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("passes a validation error to next for an empty students list", async () => {
    const req = fakeReq({
      body: { course_id: "11111111-1111-1111-1111-111111111111", students: [] },
    });
    const res = fakeRes();

    await bulkEnrollCourse(req, res, next);

    expect(svc.bulkEnrollCourse).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("dropCourse", () => {
  it("passes the enrollment id and the authenticated user to the service", async () => {
    svc.dropCourse.mockResolvedValue({ status: "DROPPED" } as never);
    const req = fakeReq({ params: { enrollment_id: "enr-1" } });
    const res = fakeRes();

    await dropCourse(req, res, next);

    expect(svc.dropCourse).toHaveBeenCalledWith("enr-1", OWNER);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Enrollment dropped successfully",
      data: { status: "DROPPED" },
    });
  });
});

describe("getEnrollment", () => {
  it("passes the requester's id and admin flag, derived from their roles", async () => {
    svc.getEnrollment.mockResolvedValue({ enrollment_id: "enr-1" } as never);
    const req = fakeReq({
      params: { enrollment_id: "enr-1" },
      user: { user_id: OWNER, tenant_id: DEFAULT_TENANT, roles: ["Admin"], permissions: [] },
    });
    const res = fakeRes();

    await getEnrollment(req, res, next);

    expect(svc.getEnrollment).toHaveBeenCalledWith("enr-1", {
      user_id: OWNER,
      isAdmin: true,
    });
  });

  it("treats a non-admin user as not an admin", async () => {
    svc.getEnrollment.mockResolvedValue({ enrollment_id: "enr-1" } as never);
    const req = fakeReq({
      params: { enrollment_id: "enr-1" },
      user: { user_id: OWNER, tenant_id: DEFAULT_TENANT, roles: ["Student"], permissions: [] },
    });
    const res = fakeRes();

    await getEnrollment(req, res, next);

    expect(svc.getEnrollment).toHaveBeenCalledWith("enr-1", {
      user_id: OWNER,
      isAdmin: false,
    });
  });
});

describe("getMyEnrollments", () => {
  it("uses the authenticated user's id and the default tenant", async () => {
    svc.getStudentEnrollments.mockResolvedValue([{ enrollment_id: "enr-1" }] as never);
    const req = fakeReq();
    const res = fakeRes();

    await getMyEnrollments(req, res, next);

    expect(svc.getStudentEnrollments).toHaveBeenCalledWith(OWNER, DEFAULT_TENANT);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ enrollment_id: "enr-1" }],
    });
  });
});

describe("getCompletedLessons", () => {
  it("passes the enrollment id and the authenticated user's id", async () => {
    svc.getCompletedLessonIds.mockResolvedValue(["lesson-1"] as never);
    const req = fakeReq({ params: { enrollment_id: "enr-1" } });
    const res = fakeRes();

    await getCompletedLessons(req, res, next);

    expect(svc.getCompletedLessonIds).toHaveBeenCalledWith("enr-1", OWNER);
  });
});

describe("admin counts", () => {
  it("countAllEnrollments wraps the count in a data object", async () => {
    svc.countAllEnrollments.mockResolvedValue(42 as never);
    const req = fakeReq();
    const res = fakeRes();

    await countAllEnrollments(req, res, next);

    expect(svc.countAllEnrollments).toHaveBeenCalledWith(DEFAULT_TENANT);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { count: 42 } });
  });

  it("countEnrollmentsByCourse returns the list as-is", async () => {
    svc.countEnrollmentsByCourse.mockResolvedValue([{ course_id: "c-1", count: 5 }] as never);
    const req = fakeReq();
    const res = fakeRes();

    await countEnrollmentsByCourse(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ course_id: "c-1", count: 5 }],
    });
  });
});