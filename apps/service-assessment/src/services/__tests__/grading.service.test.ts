import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@rv-lms/shared-utils";
import { gradingService } from "../grading.service";
import { prisma } from "../../db/prisma";
import { attemptRepository } from "../../repositories/attempt.repository";
import { answerRepository } from "../../repositories/answer.repository";
import { questionRepository } from "../../repositories/question.repository";
import { assessmentRepository } from "../../repositories/assessment.repository";
import { computeFinalScore } from "../scoring.util";
import { courseServiceClient } from "../../clients/course-service.client";

vi.mock("../../db/prisma", () => ({
  prisma: { answer: { findUnique: vi.fn() }, $transaction: vi.fn() },
}));

vi.mock("../../repositories/attempt.repository", () => ({
  attemptRepository: { findPendingReview: vi.fn(), updateStatus: vi.fn() },
}));

vi.mock("../../repositories/answer.repository", () => ({
  answerRepository: { gradeAnswer: vi.fn(), findByAttempt: vi.fn() },
}));

vi.mock("../../repositories/question.repository", () => ({
  questionRepository: { findByAssessmentId: vi.fn() },
}));

vi.mock("../../repositories/assessment.repository", () => ({
  assessmentRepository: { findById: vi.fn() },
}));

// Scoring has its own tests. Here it is replaced, so these tests only check
// that grading calls it correctly and stores what it returns.
vi.mock("../scoring.util", () => ({ computeFinalScore: vi.fn() }));

vi.mock("../../clients/course-service.client", () => ({
  courseServiceClient: { canEditCourse: vi.fn() },
}));

const findAnswer = vi.mocked(prisma.answer.findUnique);
const gradeAnswerRow = vi.mocked(answerRepository.gradeAnswer);
const findAnswers = vi.mocked(answerRepository.findByAttempt);
const findQuestions = vi.mocked(questionRepository.findByAssessmentId);
const findAssessment = vi.mocked(assessmentRepository.findById);
const updateStatus = vi.mocked(attemptRepository.updateStatus);
const finalScore = vi.mocked(computeFinalScore);
const canGrade = vi.mocked(courseServiceClient.canEditCourse);

// The transaction client is only passed through, so a marker object is enough.
const tx = { tag: "fake-transaction" };

beforeEach(() => {
  // Run the transaction callback straight away, with our fake client.
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (callback: (client: typeof tx) => unknown) => callback(tx)) as never
  );
});

type Q = { question_id: string; type: "MCQ" | "MANUAL" };
type A = { question_id: string; points_awarded: number | null };

const manualQ = (id: string): Q => ({ question_id: id, type: "MANUAL" });
const mcqQ = (id: string): Q => ({ question_id: id, type: "MCQ" });
const graded = (id: string, points: number | null): A => ({
  question_id: id,
  points_awarded: points,
});


function arrange(options: {
  questions: Q[];
  answers: A[];
  questionType?: "MANUAL" | "MCQ";
  attemptStatus?: string;
  passMark?: number;
}) {
  findAnswer.mockResolvedValue({
    answer_id: "a-1",
    attempt_id: "att-1",
    question: { type: options.questionType ?? "MANUAL" },
    attempt: {
      attempt_id: "att-1",
      assessment_id: "asm-1",
      status: options.attemptStatus ?? "PENDING_REVIEW",
    },
  } as never);
  findAnswers.mockResolvedValue(options.answers as never);
  findQuestions.mockResolvedValue(options.questions as never);
  findAssessment.mockResolvedValue({
    course_id: "course-1",
    passing_percentage: options.passMark ?? 70,
  } as never);
  finalScore.mockResolvedValue({ scorePercentage: 82, passed: true } as never);
  updateStatus.mockResolvedValue({ attempt_id: "att-1" } as never);
  canGrade.mockResolvedValue(true);
}

const grade = () =>
  gradingService.gradeAnswer(
    "a-1",
    { is_correct: true, points_awarded: 4 },
    "Bearer grader-token"
  );

describe("gradingService.gradeAnswer: checks before grading", () => {
  it("throws NotFoundError when the answer does not exist", async () => {
    findAnswer.mockResolvedValue(null as never);

    await expect(grade()).rejects.toThrow(NotFoundError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses to grade a multiple-choice answer by hand", async () => {
    arrange({ questionType: "MCQ", questions: [], answers: [] });

    await expect(grade()).rejects.toThrow(ValidationError);
    expect(gradeAnswerRow).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(["IN_PROGRESS", "GRADED"])(
    "refuses to grade an answer in an attempt that is %s, not waiting for review",
    async (attemptStatus) => {
      arrange({ attemptStatus, questions: [], answers: [] });

      await expect(grade()).rejects.toThrow(ValidationError);
      expect(gradeAnswerRow).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  );
});

describe("gradingService.gradeAnswer: grading an answer in an attempt under review", () => {
  it("records the grade inside the transaction", async () => {
    arrange({
      questions: [manualQ("q-1")],
      answers: [graded("q-1", 4)],
    });

    await grade();

    expect(gradeAnswerRow).toHaveBeenCalledWith(
      "a-1",
      { is_correct: true, points_awarded: 4 },
      tx
    );
  });

  it("reads the attempt's answers and the assessment's questions inside the same transaction", async () => {
    arrange({
      questions: [manualQ("q-1")],
      answers: [graded("q-1", 4)],
    });

    await grade();

    expect(findAnswers).toHaveBeenCalledWith("att-1", tx);
    expect(findQuestions).toHaveBeenCalledWith("asm-1", tx);
  });

  it("keeps the attempt in review while another manual answer is still ungraded", async () => {
    arrange({
      questions: [manualQ("q-1"), manualQ("q-2")],
      answers: [graded("q-1", 4), graded("q-2", null)],
    });

    await grade();

    expect(updateStatus).toHaveBeenCalledWith(
      "att-1",
      { status: "PENDING_REVIEW" },
      tx
    );
    expect(finalScore).not.toHaveBeenCalled();
  });

  it("treats zero points as graded, not as still waiting", async () => {
    arrange({
      questions: [manualQ("q-1")],
      answers: [graded("q-1", 0)],
    });

    await grade();

    expect(updateStatus).toHaveBeenCalledWith(
      "att-1",
      expect.objectContaining({ status: "GRADED" }),
      tx
    );
  });

  it("only looks at manual answers when deciding whether review is finished", async () => {
    arrange({
      questions: [mcqQ("q-1"), manualQ("q-2")],
      answers: [graded("q-1", null), graded("q-2", 4)],
    });

    await grade();

    expect(updateStatus).toHaveBeenCalledWith(
      "att-1",
      expect.objectContaining({ status: "GRADED" }),
      tx
    );
  });

  it("scores and grades the attempt once every manual answer has a grade", async () => {
    arrange({
      questions: [manualQ("q-1"), manualQ("q-2")],
      answers: [graded("q-1", 4), graded("q-2", 3)],
    });

    const result = await grade();

    expect(finalScore).toHaveBeenCalledWith("asm-1", "att-1", 70, tx);
    expect(updateStatus).toHaveBeenCalledWith(
      "att-1",
      {
        status: "GRADED",
        score_percentage: 82,
        passed: true,
        graded_at: expect.any(Date),
      },
      tx
    );
    expect(result).toEqual({ attempt_id: "att-1" });
  });

  it("scores against the assessment's own pass mark", async () => {
    arrange({
      questions: [manualQ("q-1")],
      answers: [graded("q-1", 4)],
      passMark: 55,
    });

    await grade();

    expect(finalScore).toHaveBeenCalledWith("asm-1", "att-1", 55, tx);
  });

  it("looks the assessment up before opening the transaction, to check course access first", async () => {
    arrange({
      questions: [manualQ("q-1")],
      answers: [graded("q-1", 4)],
    });

    await grade();

    expect(findAssessment).toHaveBeenCalledWith("asm-1");
    expect(findAssessment.mock.invocationCallOrder[0]).toBeLessThan(
      (prisma.$transaction as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]
    );
  });
  
  it("checks whether the grader may edit the answer's course, using their own auth header", async () => {
    arrange({ questions: [manualQ("q-1")], answers: [graded("q-1", 4)] });

    await grade();

    expect(canGrade).toHaveBeenCalledWith("course-1", "Bearer grader-token");
  });

  it("refuses to grade, and opens no transaction, for someone who does not teach the course", async () => {
    arrange({ questions: [manualQ("q-1")], answers: [graded("q-1", 4)] });
    canGrade.mockResolvedValue(false);

    await expect(grade()).rejects.toThrow(ForbiddenError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws NotFoundError, and grades nothing, when the assessment has gone", async () => {
    arrange({
      questions: [manualQ("q-1")],
      answers: [graded("q-1", 4)],
    });
    findAssessment.mockResolvedValue(null as never);

    await expect(grade()).rejects.toThrow(NotFoundError);
    expect(updateStatus).not.toHaveBeenCalled();
  });

  // Known gap: if the student never answered a manual question there is no
  // answer row for the reviewer to grade, so the attempt stays in review for
  // ever. Kept as a todo rather than a test that would lock that in.
  it.todo(
    "grades an attempt whose student skipped a manual question, counting it as zero"
  );
});

describe("gradingService.listPendingReview", () => {
  it("lists the attempts waiting for review within a tenant", async () => {
    vi.mocked(attemptRepository.findPendingReview).mockResolvedValue([
      { attempt_id: "att-1" },
    ] as never);

    const result = await gradingService.listPendingReview("tenant-1");

    expect(attemptRepository.findPendingReview).toHaveBeenCalledWith("tenant-1");
    expect(result).toEqual([{ attempt_id: "att-1" }]);
  });
});