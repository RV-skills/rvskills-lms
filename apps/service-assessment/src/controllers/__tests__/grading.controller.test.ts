import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { listPendingReviewController, gradeAnswerController } from "../grading.controller";
import { gradingService } from "../../services/grading.service";

vi.mock("../../services/grading.service", () => ({
  gradingService: {
    listPendingReview: vi.fn(),
    gradeAnswer: vi.fn(),
  },
}));

const svc = vi.mocked(gradingService);

const FACULTY = { user_id: "f-1", tenant_id: "tenant-1", roles: ["Faculty"], permissions: [] };

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

function fakeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    body: {},
    params: {},
    headers: { authorization: "Bearer faculty-token" },
    user: FACULTY,
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

const next = vi.fn() as unknown as NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listPendingReviewController", () => {
  it("lists attempts pending review within the caller's tenant", async () => {
    svc.listPendingReview.mockResolvedValue([{ attempt_id: "att-1" }] as never);
    const req = fakeReq();
    const res = fakeRes();

    await listPendingReviewController(req, res, next);

    expect(svc.listPendingReview).toHaveBeenCalledWith("tenant-1");
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ attempt_id: "att-1" }] });
  });
});

describe("gradeAnswerController", () => {
  it("passes the answer id, the grade, and the grader's own auth header through", async () => {
    svc.gradeAnswer.mockResolvedValue({ attempt_id: "att-1", status: "GRADED" } as never);
    const req = fakeReq({
      params: { answer_id: "a-1" },
      body: { is_correct: true, points_awarded: 5 },
      headers: { authorization: "Bearer faculty-token" },
    });
    const res = fakeRes();

    await gradeAnswerController(req, res, next);

    expect(svc.gradeAnswer).toHaveBeenCalledWith(
      "a-1",
      { is_correct: true, points_awarded: 5 },
      "Bearer faculty-token"
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("passes a service error (e.g. not the course's own teacher) to next", async () => {
    svc.gradeAnswer.mockRejectedValue(new Error("not your course"));
    const req = fakeReq({ params: { answer_id: "a-1" } });
    const res = fakeRes();

    await gradeAnswerController(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});