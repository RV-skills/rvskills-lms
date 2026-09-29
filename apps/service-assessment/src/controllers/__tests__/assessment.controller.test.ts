import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  createAssessmentController,
  addQuestionController,
  updateQuestionController,
  listAssessmentsForCourseController,
  getAssessmentController,
  getAssessmentFullController,
} from "../assessment.controller";
import { assessmentService } from "../../services/assessment.service";

vi.mock("../../services/assessment.service", () => ({
  assessmentService: {
    createAssessment: vi.fn(),
    addQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    getAssessmentsForCourse: vi.fn(),
    getAssessmentForStudent: vi.fn(),
    getAssessmentFull: vi.fn(),
  },
}));

const svc = vi.mocked(assessmentService);

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
    headers: {},
    user: FACULTY,
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

const next = vi.fn() as unknown as NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAssessmentController", () => {
  it("builds the assessment from the body and the caller's tenant, and responds 201", async () => {
    svc.createAssessment.mockResolvedValue({ assessment_id: "asm-1" } as never);
    const req = fakeReq({
      body: { course_id: "course-1", title: "Final Quiz", passing_percentage: 70, max_attempts: 3 },
    });
    const res = fakeRes();

    await createAssessmentController(req, res, next);

    expect(svc.createAssessment).toHaveBeenCalledWith({
      course_id: "course-1",
      tenant_id: "tenant-1",
      title: "Final Quiz",
      passing_percentage: 70,
      max_attempts: 3,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { assessment_id: "asm-1" } });
  });

  it("passes a service error to next", async () => {
    svc.createAssessment.mockRejectedValue(new Error("bad request"));
    const req = fakeReq({ body: {} });
    const res = fakeRes();

    await createAssessmentController(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("addQuestionController", () => {
  it("passes the assessment id and the whole body through, and responds 201", async () => {
    svc.addQuestion.mockResolvedValue({ question_id: "q-1" } as never);
    const req = fakeReq({
      params: { assessment_id: "asm-1" },
      body: { type: "MCQ", prompt: "2 + 2?", options: [] },
    });
    const res = fakeRes();

    await addQuestionController(req, res, next);

    expect(svc.addQuestion).toHaveBeenCalledWith("asm-1", {
      type: "MCQ",
      prompt: "2 + 2?",
      options: [],
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("updateQuestionController", () => {
  it("passes the question id and body through, and responds 200", async () => {
    svc.updateQuestion.mockResolvedValue({ question_id: "q-1", prompt: "Updated" } as never);
    const req = fakeReq({ params: { question_id: "q-1" }, body: { prompt: "Updated" } });
    const res = fakeRes();

    await updateQuestionController(req, res, next);

    expect(svc.updateQuestion).toHaveBeenCalledWith("q-1", { prompt: "Updated" });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("listAssessmentsForCourseController", () => {
  it("lists assessments for the course in the caller's tenant", async () => {
    svc.getAssessmentsForCourse.mockResolvedValue([{ assessment_id: "asm-1" }] as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await listAssessmentsForCourseController(req, res, next);

    expect(svc.getAssessmentsForCourse).toHaveBeenCalledWith("course-1", "tenant-1");
  });
});

describe("getAssessmentController", () => {
  it("fetches the student-safe view of the assessment", async () => {
    svc.getAssessmentForStudent.mockResolvedValue({ assessment_id: "asm-1" } as never);
    const req = fakeReq({ params: { assessment_id: "asm-1" } });
    const res = fakeRes();

    await getAssessmentController(req, res, next);

    expect(svc.getAssessmentForStudent).toHaveBeenCalledWith("asm-1");
  });
});

describe("getAssessmentFullController", () => {
  it("fetches the full view (including correct answers)", async () => {
    svc.getAssessmentFull.mockResolvedValue({ assessment_id: "asm-1" } as never);
    const req = fakeReq({ params: { assessment_id: "asm-1" } });
    const res = fakeRes();

    await getAssessmentFullController(req, res, next);

    expect(svc.getAssessmentFull).toHaveBeenCalledWith("asm-1");
  });
});