import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { NotFoundError } from "@rv-lms/shared-utils";
import { getPlatformStatsController } from "../admin-stats.controller";
import { getMyLearningController } from "../dashboard.controller";
import { getCoursePlayerController } from "../course-player.controller";
import { enrollInCourseController, getMyEnrollmentsController } from "../enrollments.controller";
import { listPendingReviewController, gradeAnswerController } from "../grading.controller";
import { getPlatformStats } from "../../services/admin-stats.service";
import { getMyLearning } from "../../services/dashboard.service";
import { getCoursePlayerData } from "../../services/course-player.service";
import { enrollInCourse, getMyEnrollments } from "../../services/enrollment.service";
import { assessmentService } from "../../services/assessment.service";

vi.mock("../../services/admin-stats.service", () => ({ getPlatformStats: vi.fn() }));
vi.mock("../../services/dashboard.service", () => ({ getMyLearning: vi.fn() }));
vi.mock("../../services/course-player.service", () => ({ getCoursePlayerData: vi.fn() }));
vi.mock("../../services/enrollment.service", () => ({
  enrollInCourse: vi.fn(),
  getMyEnrollments: vi.fn(),
}));
vi.mock("../../services/assessment.service", () => ({
  assessmentService: { listPendingReview: vi.fn(), gradeAnswer: vi.fn() },
}));

const TOKEN = "Bearer test-token";

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

function fakeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return { body: {}, params: {}, accessToken: TOKEN, ...overrides } as unknown as AuthenticatedRequest;
}

const next = vi.fn() as unknown as NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPlatformStatsController", () => {
  it("passes the caller's own access token", async () => {
    vi.mocked(getPlatformStats).mockResolvedValue({ totalUsers: 10 } as never);
    const req = fakeReq();
    const res = fakeRes();

    await getPlatformStatsController(req, res, next);

    expect(getPlatformStats).toHaveBeenCalledWith(TOKEN);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("getMyLearningController", () => {
  it("passes the caller's own access token", async () => {
    vi.mocked(getMyLearning).mockResolvedValue({ inProgress: [] } as never);
    const req = fakeReq();
    const res = fakeRes();

    await getMyLearningController(req, res, next);

    expect(getMyLearning).toHaveBeenCalledWith(TOKEN);
  });
});

describe("getCoursePlayerController", () => {
  it("returns the player data for a real course", async () => {
    vi.mocked(getCoursePlayerData).mockResolvedValue({ course_id: "course-1" } as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await getCoursePlayerController(req, res, next);

    expect(getCoursePlayerData).toHaveBeenCalledWith("course-1", TOKEN);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("turns a null result into a real NotFoundError, not an empty 200", async () => {
    vi.mocked(getCoursePlayerData).mockResolvedValue(null as never);
    const req = fakeReq({ params: { course_id: "missing-course" } });
    const res = fakeRes();

    await getCoursePlayerController(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("enrollInCourseController", () => {
  it("passes the course id and the caller's access token, and responds 201", async () => {
    vi.mocked(enrollInCourse).mockResolvedValue({ enrollment_id: "enr-1" } as never);
    const req = fakeReq({ body: { course_id: "course-1" } });
    const res = fakeRes();

    await enrollInCourseController(req, res, next);

    expect(enrollInCourse).toHaveBeenCalledWith("course-1", TOKEN);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("getMyEnrollmentsController", () => {
  it("passes the caller's own access token", async () => {
    vi.mocked(getMyEnrollments).mockResolvedValue([{ enrollment_id: "enr-1" }] as never);
    const req = fakeReq();
    const res = fakeRes();

    await getMyEnrollmentsController(req, res, next);

    expect(getMyEnrollments).toHaveBeenCalledWith(TOKEN);
  });
});

describe("listPendingReviewController", () => {
  it("passes the caller's own access token", async () => {
    vi.mocked(assessmentService.listPendingReview).mockResolvedValue([] as never);
    const req = fakeReq();
    const res = fakeRes();

    await listPendingReviewController(req, res, next);

    expect(assessmentService.listPendingReview).toHaveBeenCalledWith(TOKEN);
  });
});

describe("gradeAnswerController", () => {
  it("passes the answer id, the grade body, and the grader's own access token", async () => {
    vi.mocked(assessmentService.gradeAnswer).mockResolvedValue({ attempt_id: "att-1" } as never);
    const req = fakeReq({
      params: { answer_id: "a-1" },
      body: { is_correct: true, points_awarded: 5 },
    });
    const res = fakeRes();

    await gradeAnswerController(req, res, next);

    expect(assessmentService.gradeAnswer).toHaveBeenCalledWith(
      "a-1",
      { is_correct: true, points_awarded: 5 },
      TOKEN
    );
  });
});