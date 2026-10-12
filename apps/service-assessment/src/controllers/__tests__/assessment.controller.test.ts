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
  it("validates the body, adds the caller's tenant, passes their auth header, and responds 201", async () => {
    svc.createAssessment.mockResolvedValue({ assessment_id: "asm-1" } as never);
    const req = fakeReq({
      body: { course_id: "course-1", title: "Final Quiz", passing_percentage: 70, max_attempts: 3 },
      headers: { authorization: "Bearer faculty-token" },
    });
    const res = fakeRes();

    await createAssessmentController(req, res, next);

    expect(svc.createAssessment).toHaveBeenCalledWith(
      { course_id: "course-1", tenant_id: "tenant-1", title: "Final Quiz", passing_percentage: 70, max_attempts: 3 },
      "Bearer faculty-token"
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it.each([
    ["a missing title", { course_id: "course-1", passing_percentage: 70 }],
    ["a pass mark over 100", { course_id: "course-1", title: "Q", passing_percentage: 101 }],
    ["a fractional pass mark", { course_id: "course-1", title: "Q", passing_percentage: 50.5 }],
    ["zero allowed attempts", { course_id: "course-1", title: "Q", passing_percentage: 50, max_attempts: 0 }],
  ])("rejects %s without calling the service", async (_label, body) => {
    await createAssessmentController(fakeReq({ body, headers: { authorization: "Bearer faculty-token" } }), fakeRes(), next);

    expect(svc.createAssessment).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("addQuestionController", () => {
  it("validates the question, passes it on with the caller's auth header, and responds 201", async () => {
    svc.addQuestion.mockResolvedValue({ question_id: "q-1" } as never);
    const body = { type: "MCQ", prompt: "2 + 2?", points: 2, options: [{ text: "4", is_correct: true }, { text: "5", is_correct: false }] };
    const res = fakeRes();

    await addQuestionController(fakeReq({ params: { assessment_id: "asm-1" }, body, headers: { authorization: "Bearer faculty-token" } }), res, next);

    expect(svc.addQuestion).toHaveBeenCalledWith("asm-1", body, "Bearer faculty-token");
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("gives a written question an empty options list when none is sent", async () => {
    svc.addQuestion.mockResolvedValue({ question_id: "q-2" } as never);

    await addQuestionController(
      fakeReq({ params: { assessment_id: "asm-1" }, body: { type: "MANUAL", prompt: "Explain" }, headers: { authorization: "Bearer faculty-token" } }),
      fakeRes(),
      next
    );

    expect(svc.addQuestion).toHaveBeenCalledWith("asm-1", { type: "MANUAL", prompt: "Explain", options: [] }, "Bearer faculty-token");
  });

  it.each([
    ["an unknown question type", { type: "ESSAY", prompt: "Q", options: [] }],
    ["an empty prompt", { type: "MANUAL", prompt: "  ", options: [] }],
    ["an MCQ with one option", { type: "MCQ", prompt: "Q", options: [{ text: "A", is_correct: true }] }],
    ["a written question with options", { type: "MANUAL", prompt: "Q", options: [{ text: "A", is_correct: true }] }],
    ["zero points", { type: "MANUAL", prompt: "Q", points: 0, options: [] }],
  ])("rejects %s without calling the service", async (_label, body) => {
    await addQuestionController(fakeReq({ params: { assessment_id: "asm-1" }, body, headers: { authorization: "Bearer faculty-token" } }), fakeRes(), next);

    expect(svc.addQuestion).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("updateQuestionController", () => {
  it("validates the change, passes it on with the caller's auth header, and responds 200", async () => {
    svc.updateQuestion.mockResolvedValue({ question_id: "q-1" } as never);
    const res = fakeRes();

    await updateQuestionController(fakeReq({ params: { question_id: "q-1" }, body: { prompt: "New wording" }, headers: { authorization: "Bearer faculty-token" } }), res, next);

    expect(svc.updateQuestion).toHaveBeenCalledWith("q-1", { prompt: "New wording" }, "Bearer faculty-token");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects an empty change without calling the service", async () => {
    await updateQuestionController(fakeReq({ params: { question_id: "q-1" }, body: {}, headers: { authorization: "Bearer faculty-token" } }), fakeRes(), next);

    expect(svc.updateQuestion).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
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
  it("fetches the full view (including correct answers), passing the caller's auth header so the service can check they teach the course", async () => {
    svc.getAssessmentFull.mockResolvedValue({ assessment_id: "asm-1" } as never);
    const res = fakeRes();

    await getAssessmentFullController(fakeReq({ params: { assessment_id: "asm-1" }, headers: { authorization: "Bearer faculty-token" } }), res, next);

    expect(svc.getAssessmentFull).toHaveBeenCalledWith("asm-1", "Bearer faculty-token");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
