import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "@rv-lms/shared-utils";
import { buildResults, resultsService } from "../results.service";
import { courseServiceClient } from "../../clients/course-service.client";
import { assessmentRepository } from "../../repositories/assessment.repository";
import { attemptRepository } from "../../repositories/attempt.repository";
import { questionRepository } from "../../repositories/question.repository";

vi.mock("../../clients/course-service.client", () => ({ courseServiceClient: { canEditCourse: vi.fn() } }));
vi.mock("../../repositories/assessment.repository", () => ({ assessmentRepository: { findById: vi.fn() } }));
vi.mock("../../repositories/attempt.repository", () => ({ attemptRepository: { findAllForAssessment: vi.fn() } }));
vi.mock("../../repositories/question.repository", () => ({ questionRepository: { findByAssessmentId: vi.fn() } }));
vi.mock("../../db/prisma", () => ({ prisma: {} }));

const assessment = { assessment_id: "a1", course_id: "c1", title: "Quiz", passing_percentage: 50, max_attempts: 3 };
const questions = [
  { question_id: "q1", prompt: "Easy", type: "MCQ", points: 2, order_index: 0 },
  { question_id: "q2", prompt: "Hard", type: "MANUAL", points: 8, order_index: 1 },
];
const d = (s: string) => new Date(s);
const attempts = [
  // s1: failed once, then passed
  { attempt_id: "1", student_id: "s1", attempt_number: 1, status: "GRADED", score_percentage: 20, passed: false, submitted_at: d("2026-10-01"),
    answers: [{ question_id: "q1", points_awarded: 2 }, { question_id: "q2", points_awarded: 0 }] },
  { attempt_id: "2", student_id: "s1", attempt_number: 2, status: "GRADED", score_percentage: 80, passed: true, submitted_at: d("2026-10-03"),
    answers: [{ question_id: "q1", points_awarded: 2 }, { question_id: "q2", points_awarded: 6 }] },
  // s2: failed
  { attempt_id: "3", student_id: "s2", attempt_number: 1, status: "GRADED", score_percentage: 20, passed: false, submitted_at: d("2026-10-02"),
    answers: [{ question_id: "q1", points_awarded: 2 }] },
  // s3: waiting for marking
  { attempt_id: "4", student_id: "s3", attempt_number: 1, status: "PENDING_REVIEW", score_percentage: null, passed: null, submitted_at: d("2026-10-04"),
    answers: [{ question_id: "q1", points_awarded: 2 }, { question_id: "q2", points_awarded: null }] },
];

describe("buildResults", () => {
  const r = buildResults(assessment, questions, attempts as never);

  it("gives one row per student with their best score and status", () => {
    const s1 = r.students.find((s) => s.student_id === "s1")!;
    expect(s1).toMatchObject({ attempts_used: 2, best_score: 80, status: "PASSED" });
    expect(s1.last_submitted_at).toEqual(d("2026-10-03"));
    expect(r.students.find((s) => s.student_id === "s2")).toMatchObject({ best_score: 20, status: "NOT_PASSED" });
    expect(r.students.find((s) => s.student_id === "s3")).toMatchObject({ best_score: null, status: "WAITING" });
  });

  it("works out the overall figures from marked students only", () => {
    expect(r.summary).toEqual({ students_attempted: 3, students_marked: 2, waiting: 1, average_best_score: 50, pass_rate: 50 });
  });

  it("lists questions hardest first, counting missing answers as zero", () => {
    // q2 over 3 graded attempts: (0 + 6 + 0) / 24 = 25%; q1: 6 / 6 = 100%
    expect(r.questions.map((q) => [q.prompt, q.average_percentage])).toEqual([["Hard", 25], ["Easy", 100]]);
  });

  it("handles an assessment nobody has taken", () => {
    const empty = buildResults(assessment, questions, []);
    expect(empty.summary).toMatchObject({ students_attempted: 0, average_best_score: null, pass_rate: null });
    expect(empty.questions.every((q) => q.average_percentage === null)).toBe(true);
  });
});

describe("resultsService.getResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assessmentRepository.findById).mockResolvedValue(assessment as never);
    vi.mocked(courseServiceClient.canEditCourse).mockResolvedValue(true);
    vi.mocked(attemptRepository.findAllForAssessment).mockResolvedValue([] as never);
    vi.mocked(questionRepository.findByAssessmentId).mockResolvedValue(questions as never);
  });

  it("returns results to the course's own faculty", async () => {
    const r = await resultsService.getResults("a1", "Bearer f");
    expect(courseServiceClient.canEditCourse).toHaveBeenCalledWith("c1", "Bearer f");
    expect(r.assessment.title).toBe("Quiz");
  });

  it("refuses anyone else", async () => {
    vi.mocked(courseServiceClient.canEditCourse).mockResolvedValue(false);
    await expect(resultsService.getResults("a1", "Bearer x")).rejects.toBeInstanceOf(ForbiddenError);
    expect(attemptRepository.findAllForAssessment).not.toHaveBeenCalled();
  });

  it("404s for a missing assessment", async () => {
    vi.mocked(assessmentRepository.findById).mockResolvedValue(null as never);
    await expect(resultsService.getResults("nope", "Bearer f")).rejects.toBeInstanceOf(NotFoundError);
  });
});
