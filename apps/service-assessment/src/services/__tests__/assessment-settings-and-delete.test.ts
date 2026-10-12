import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "@rv-lms/shared-utils";
import { assessmentService } from "../assessment.service";
import { courseServiceClient } from "../../clients/course-service.client";
import { assessmentRepository } from "../../repositories/assessment.repository";
import { questionRepository } from "../../repositories/question.repository";
import { attemptRepository } from "../../repositories/attempt.repository";
import { GradeAnswerSchema } from "../../validators/grading.validator";
import { UpdateAssessmentSchema } from "../../validators/assessment.validator";

vi.mock("../../clients/course-service.client", () => ({
  courseServiceClient: { canEditCourse: vi.fn() },
}));
vi.mock("../../repositories/assessment.repository", () => ({
  assessmentRepository: { findById: vi.fn(), update: vi.fn() },
}));
vi.mock("../../repositories/question.repository", () => ({
  questionRepository: { findById: vi.fn(), delete: vi.fn(), shiftDownAfter: vi.fn() },
}));
vi.mock("../../repositories/attempt.repository", () => ({
  attemptRepository: { existsForAssessment: vi.fn() },
}));
vi.mock("../../db/prisma", () => ({
  prisma: { $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn("tx")) },
}));

const AUTH = "Bearer faculty-token";
const assessment = { assessment_id: "a1", course_id: "c1", passing_percentage: 60, max_attempts: 3 };
const question = { question_id: "q1", assessment_id: "a1", order_index: 1, is_locked: false };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(courseServiceClient.canEditCourse).mockResolvedValue(true);
  vi.mocked(assessmentRepository.findById).mockResolvedValue(assessment as never);
  vi.mocked(assessmentRepository.update).mockImplementation(async (_id, data) => ({ ...assessment, ...data }) as never);
  vi.mocked(questionRepository.findById).mockResolvedValue(question as never);
  vi.mocked(attemptRepository.existsForAssessment).mockResolvedValue(false);
});

describe("assessmentService.updateAssessment", () => {
  it("changes anything before students start", async () => {
    await assessmentService.updateAssessment("a1", { title: "New", passing_percentage: 70, max_attempts: 1 }, AUTH);
    expect(assessmentRepository.update).toHaveBeenCalledWith("a1", { title: "New", passing_percentage: 70, max_attempts: 1 });
  });

  it("refuses faculty who don't teach the course", async () => {
    vi.mocked(courseServiceClient.canEditCourse).mockResolvedValue(false);
    await expect(assessmentService.updateAssessment("a1", { title: "x" }, AUTH)).rejects.toBeInstanceOf(ForbiddenError);
    expect(assessmentRepository.update).not.toHaveBeenCalled();
  });

  it("404s for a missing assessment", async () => {
    vi.mocked(assessmentRepository.findById).mockResolvedValue(null as never);
    await expect(assessmentService.updateAssessment("nope", { title: "x" }, AUTH)).rejects.toBeInstanceOf(NotFoundError);
  });

  describe("after students have started", () => {
    beforeEach(() => vi.mocked(attemptRepository.existsForAssessment).mockResolvedValue(true));

    it("still allows a new title", async () => {
      await assessmentService.updateAssessment("a1", { title: "Renamed" }, AUTH);
      expect(assessmentRepository.update).toHaveBeenCalledWith("a1", { title: "Renamed" });
    });

    it("blocks a pass mark change", async () => {
      await expect(assessmentService.updateAssessment("a1", { passing_percentage: 40 }, AUTH)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("allows resending the same pass mark", async () => {
      await assessmentService.updateAssessment("a1", { passing_percentage: 60 }, AUTH);
      expect(assessmentRepository.update).toHaveBeenCalled();
    });

    it("allows raising the attempt limit or making it unlimited", async () => {
      await assessmentService.updateAssessment("a1", { max_attempts: 5 }, AUTH);
      await assessmentService.updateAssessment("a1", { max_attempts: null }, AUTH);
      expect(assessmentRepository.update).toHaveBeenCalledTimes(2);
    });

    it("blocks lowering the attempt limit", async () => {
      await expect(assessmentService.updateAssessment("a1", { max_attempts: 2 }, AUTH)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("blocks adding a limit to an unlimited assessment", async () => {
      vi.mocked(assessmentRepository.findById).mockResolvedValue({ ...assessment, max_attempts: null } as never);
      await expect(assessmentService.updateAssessment("a1", { max_attempts: 10 }, AUTH)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});

describe("assessmentService.deleteQuestion", () => {
  it("deletes and closes the gap in the numbering", async () => {
    await expect(assessmentService.deleteQuestion("q1", AUTH)).resolves.toEqual({ question_id: "q1" });
    expect(questionRepository.delete).toHaveBeenCalledWith("q1", "tx");
    expect(questionRepository.shiftDownAfter).toHaveBeenCalledWith("a1", 1, "tx");
  });

  it("refuses once a student has started", async () => {
    vi.mocked(attemptRepository.existsForAssessment).mockResolvedValue(true);
    await expect(assessmentService.deleteQuestion("q1", AUTH)).rejects.toBeInstanceOf(ForbiddenError);
    expect(questionRepository.delete).not.toHaveBeenCalled();
  });

  it("refuses a locked question", async () => {
    vi.mocked(questionRepository.findById).mockResolvedValue({ ...question, is_locked: true } as never);
    await expect(assessmentService.deleteQuestion("q1", AUTH)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses faculty who don't teach the course", async () => {
    vi.mocked(courseServiceClient.canEditCourse).mockResolvedValue(false);
    await expect(assessmentService.deleteQuestion("q1", AUTH)).rejects.toBeInstanceOf(ForbiddenError);
    expect(questionRepository.delete).not.toHaveBeenCalled();
  });

  it("404s for a missing question", async () => {
    vi.mocked(questionRepository.findById).mockResolvedValue(null as never);
    await expect(assessmentService.deleteQuestion("nope", AUTH)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("validators", () => {
  it("UpdateAssessmentSchema rejects an empty change", () => {
    expect(UpdateAssessmentSchema.safeParse({}).success).toBe(false);
  });

  it("GradeAnswerSchema keeps feedback and turns blank feedback into null", () => {
    expect(GradeAnswerSchema.parse({ is_correct: true, points_awarded: 2, feedback: "  Good work " }).feedback).toBe("Good work");
    expect(GradeAnswerSchema.parse({ is_correct: true, points_awarded: 2, feedback: "   " }).feedback).toBeNull();
    expect(GradeAnswerSchema.parse({ is_correct: true, points_awarded: 2 }).feedback).toBeNull();
  });

  it("GradeAnswerSchema rejects very long feedback", () => {
    expect(GradeAnswerSchema.safeParse({ is_correct: true, points_awarded: 2, feedback: "x".repeat(2001) }).success).toBe(false);
  });
});
