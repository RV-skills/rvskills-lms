import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@rv-lms/shared-utils";
import { attemptService } from "../attempt.service";
import { prisma } from "../../db/prisma";
import { assessmentRepository } from "../../repositories/assessment.repository";
import { attemptRepository } from "../../repositories/attempt.repository";
import { questionRepository } from "../../repositories/question.repository";
import { answerRepository } from "../../repositories/answer.repository";
import { enrollmentServiceClient } from "../../clients/enrollment-service.client";
import { computeFinalScore } from "../scoring.util";

vi.mock("../../db/prisma", () => ({ prisma: { $transaction: vi.fn() } }));

vi.mock("../../repositories/assessment.repository", () => ({
  assessmentRepository: { findById: vi.fn() },
}));

vi.mock("../../repositories/attempt.repository", () => ({
  attemptRepository: {
    countByAssessmentAndStudent: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findByIdWithAnswers: vi.fn(),
    updateStatus: vi.fn(),
    findByAssessmentAndStudent: vi.fn(),
  },
}));

vi.mock("../../repositories/question.repository", () => ({
  questionRepository: {
    lockAllForAssessment: vi.fn(),
    findById: vi.fn(),
    findByAssessmentId: vi.fn(),
  },
}));

vi.mock("../../repositories/answer.repository", () => ({
  answerRepository: { upsert: vi.fn() },
}));

vi.mock("../../clients/enrollment-service.client", () => ({
  enrollmentServiceClient: { isEnrolledInCourse: vi.fn() },
}));

// Scoring has its own tests. Here it is replaced, so these tests only check
// that the attempt service calls it correctly and stores what it returns.
vi.mock("../scoring.util", () => ({ computeFinalScore: vi.fn() }));

const OWNER = "student-1";
const STRANGER = "student-2";

const findAssessment = vi.mocked(assessmentRepository.findById);
const isEnrolled = vi.mocked(enrollmentServiceClient.isEnrolledInCourse);
const countAttempts = vi.mocked(attemptRepository.countByAssessmentAndStudent);
const createAttempt = vi.mocked(attemptRepository.create);
const findAttempt = vi.mocked(attemptRepository.findById);
const findAttemptWithAnswers = vi.mocked(attemptRepository.findByIdWithAnswers);
const updateStatus = vi.mocked(attemptRepository.updateStatus);
const lockQuestions = vi.mocked(questionRepository.lockAllForAssessment);
const findQuestion = vi.mocked(questionRepository.findById);
const findQuestions = vi.mocked(questionRepository.findByAssessmentId);
const upsertAnswer = vi.mocked(answerRepository.upsert);
const finalScore = vi.mocked(computeFinalScore);

// A stand-in for the transaction client Prisma hands to a $transaction callback.
const tx = { $executeRaw: vi.fn(), answer: { update: vi.fn() } };

beforeEach(() => {
  // Run the transaction callback straight away, with our fake client.
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (callback: (client: typeof tx) => unknown) => callback(tx)) as never
  );
});

describe("attemptService.startAttempt", () => {
  function arrange(
    options: {
      maxAttempts?: number | null;
      existing?: number;
      enrolled?: boolean;
    } = {}
  ) {
    findAssessment.mockResolvedValue({
      assessment_id: "asm-1",
      course_id: "course-1",
      max_attempts: options.maxAttempts === undefined ? 3 : options.maxAttempts,
    } as never);
    isEnrolled.mockResolvedValue((options.enrolled ?? true) as never);
    countAttempts.mockResolvedValue((options.existing ?? 0) as never);
    createAttempt.mockResolvedValue({ attempt_id: "att-1" } as never);
  }

  const start = () =>
    attemptService.startAttempt("asm-1", OWNER, "tenant-1", "Bearer token");

  it("throws NotFoundError when the assessment does not exist", async () => {
    findAssessment.mockResolvedValue(null as never);

    await expect(start()).rejects.toThrow(NotFoundError);
    expect(isEnrolled).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError when the student is not enrolled in the course", async () => {
    arrange({ enrolled: false });

    await expect(start()).rejects.toThrow(ForbiddenError);
    expect(countAttempts).not.toHaveBeenCalled();
    expect(createAttempt).not.toHaveBeenCalled();
  });

  it("asks the enrollment service about the assessment's course, using the caller's auth header", async () => {
    arrange();

    await start();

    expect(isEnrolled).toHaveBeenCalledWith("course-1", "Bearer token");
  });

  it.each([
    [3, 3],
    [4, 3],
  ])(
    "throws ConflictError with %i attempts used and a limit of %i",
    async (existing, limit) => {
      arrange({ existing, maxAttempts: limit });

      const result = start();

      await expect(result).rejects.toThrow(ConflictError);
      await expect(result).rejects.toThrow(`all ${limit} allowed attempts`);
      expect(createAttempt).not.toHaveBeenCalled();
    }
  );

  it("has no attempt limit when max_attempts is null", async () => {
    arrange({ maxAttempts: null, existing: 50 });

    await start();

    expect(createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ attempt_number: 51 }),
      tx
    );
  });

  it("allows an attempt while below the limit, numbering it after the previous ones", async () => {
    arrange({ existing: 2, maxAttempts: 3 });

    await start();

    expect(createAttempt).toHaveBeenCalledWith(
      {
        assessment_id: "asm-1",
        student_id: OWNER,
        tenant_id: "tenant-1",
        attempt_number: 3,
      },
      tx
    );
  });

  it("numbers a first attempt 1", async () => {
    arrange({ existing: 0 });

    await start();

    expect(createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ attempt_number: 1 }),
      tx
    );
  });

  it("locks the assessment's questions in the same transaction, so they can no longer be edited", async () => {
    arrange();

    await start();

    expect(lockQuestions).toHaveBeenCalledWith("asm-1", tx);
  });

  it("takes the advisory lock before creating the attempt", async () => {
    arrange();

    await start();

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      createAttempt.mock.invocationCallOrder[0]
    );
  });

  it("returns the new attempt", async () => {
    arrange();

    await expect(start()).resolves.toEqual({ attempt_id: "att-1" });
  });

  // Known gap: the attempt count is read BEFORE the lock is taken, so two
  // requests arriving together both see the same count and both get through.
  // Kept as a todo rather than a test that would lock the bug in.
  it.todo(
    "does not let two simultaneous requests exceed max_attempts"
  );
});

describe("attemptService.submitAnswer", () => {
  function arrange(
    options: {
      attempt?: Record<string, unknown> | null;
      question?: Record<string, unknown> | null;
    } = {}
  ) {
    findAttempt.mockResolvedValue(
      (options.attempt === null
        ? null
        : {
            attempt_id: "att-1",
            assessment_id: "asm-1",
            student_id: OWNER,
            status: "IN_PROGRESS",
            ...options.attempt,
          }) as never
    );
    findQuestion.mockResolvedValue(
      (options.question === null
        ? null
        : {
            question_id: "q-1",
            assessment_id: "asm-1",
            ...options.question,
          }) as never
    );
    upsertAnswer.mockResolvedValue({ answer_id: "a-1" } as never);
  }

  const submit = (student = OWNER) =>
    attemptService.submitAnswer("att-1", student, {
      question_id: "q-1",
      selected_option_id: "o-1",
    });

  it("throws NotFoundError when the attempt does not exist", async () => {
    arrange({ attempt: null });

    await expect(submit()).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when the attempt belongs to someone else", async () => {
    arrange();

    await expect(submit(STRANGER)).rejects.toThrow(ForbiddenError);
    expect(upsertAnswer).not.toHaveBeenCalled();
  });

  it("checks ownership before status, so a stranger always gets ForbiddenError", async () => {
    arrange({ attempt: { status: "GRADED" } });

    await expect(submit(STRANGER)).rejects.toThrow(ForbiddenError);
  });

  it.each(["PENDING_REVIEW", "GRADED"])(
    "throws ValidationError when the attempt is already %s",
    async (status) => {
      arrange({ attempt: { status } });

      await expect(submit()).rejects.toThrow(ValidationError);
      expect(upsertAnswer).not.toHaveBeenCalled();
    }
  );

  it("throws NotFoundError when the question does not exist", async () => {
    arrange({ question: null });

    await expect(submit()).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for a question that belongs to a different assessment", async () => {
    arrange({ question: { assessment_id: "asm-2" } });

    await expect(submit()).rejects.toThrow(NotFoundError);
    expect(upsertAnswer).not.toHaveBeenCalled();
  });

  it("saves a chosen option", async () => {
    arrange();

    await submit();

    expect(upsertAnswer).toHaveBeenCalledWith({
      attempt_id: "att-1",
      question_id: "q-1",
      selected_option_id: "o-1",
      text_response: null,
    });
  });

  it("saves a written answer", async () => {
    arrange();

    await attemptService.submitAnswer("att-1", OWNER, {
      question_id: "q-1",
      text_response: "Because of caching.",
    });

    expect(upsertAnswer).toHaveBeenCalledWith({
      attempt_id: "att-1",
      question_id: "q-1",
      selected_option_id: null,
      text_response: "Because of caching.",
    });
  });

  it("returns what was saved", async () => {
    arrange();

    await expect(submit()).resolves.toEqual({ answer_id: "a-1" });
  });
});

describe("attemptService.submitAttempt", () => {
  type Question = {
    question_id: string;
    type: "MCQ" | "MANUAL";
    points: number;
    options: { option_id: string; is_correct: boolean }[];
  };

  /** A multiple-choice question with two options. `correct` is the right one. */
  const mcq = (id: string, points = 2, correct = "o-1"): Question => ({
    question_id: id,
    type: "MCQ",
    points,
    options: [
      { option_id: "o-1", is_correct: correct === "o-1" },
      { option_id: "o-2", is_correct: correct === "o-2" },
    ],
  });

  const manual = (id: string, points = 5): Question => ({
    question_id: id,
    type: "MANUAL",
    points,
    options: [],
  });

  function arrange(options: {
    questions: Question[];
    answers: Record<string, unknown>[];
    status?: string;
    passMark?: number;
  }) {
    findAttemptWithAnswers.mockResolvedValue({
      attempt_id: "att-1",
      assessment_id: "asm-1",
      student_id: OWNER,
      status: options.status ?? "IN_PROGRESS",
      answers: options.answers,
    } as never);
    findQuestions.mockResolvedValue(options.questions as never);
    findAssessment.mockResolvedValue({
      assessment_id: "asm-1",
      passing_percentage: options.passMark ?? 70,
    } as never);
    finalScore.mockResolvedValue({ scorePercentage: 80, passed: true } as never);
    updateStatus.mockResolvedValue({ attempt_id: "att-1" } as never);
  }

  const submit = (student = OWNER) =>
    attemptService.submitAttempt("att-1", student);

  const chose = (answerId: string, questionId: string, optionId: string | null) => ({
    answer_id: answerId,
    question_id: questionId,
    selected_option_id: optionId,
  });

  it("throws NotFoundError when the attempt does not exist", async () => {
    findAttemptWithAnswers.mockResolvedValue(null as never);

    await expect(submit()).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when the attempt belongs to someone else", async () => {
    arrange({ questions: [mcq("q-1")], answers: [] });

    await expect(submit(STRANGER)).rejects.toThrow(ForbiddenError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("checks ownership before status, so a stranger always gets ForbiddenError", async () => {
    arrange({ questions: [mcq("q-1")], answers: [], status: "GRADED" });

    await expect(submit(STRANGER)).rejects.toThrow(ForbiddenError);
  });

  it.each(["PENDING_REVIEW", "GRADED"])(
    "throws ValidationError when the attempt is already %s",
    async (status) => {
      arrange({ questions: [mcq("q-1")], answers: [], status });

      await expect(submit()).rejects.toThrow(ValidationError);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  );

  it("throws NotFoundError when the assessment no longer exists", async () => {
    arrange({ questions: [mcq("q-1")], answers: [] });
    findAssessment.mockResolvedValue(null as never);

    await expect(submit()).rejects.toThrow(NotFoundError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("marks a correct choice right and awards the question's points", async () => {
    arrange({
      questions: [mcq("q-1", 2)],
      answers: [chose("a-1", "q-1", "o-1")],
    });

    await submit();

    expect(tx.answer.update).toHaveBeenCalledWith({
      where: { answer_id: "a-1" },
      data: { is_correct: true, points_awarded: 2 },
    });
  });

  it("marks a wrong choice wrong and awards zero", async () => {
    arrange({
      questions: [mcq("q-1", 2)],
      answers: [chose("a-1", "q-1", "o-2")],
    });

    await submit();

    expect(tx.answer.update).toHaveBeenCalledWith({
      where: { answer_id: "a-1" },
      data: { is_correct: false, points_awarded: 0 },
    });
  });

  it("checks against whichever option is flagged correct, not the first one", async () => {
    arrange({
      questions: [mcq("q-1", 2, "o-2")],
      answers: [chose("a-1", "q-1", "o-2")],
    });

    await submit();

    expect(tx.answer.update).toHaveBeenCalledWith({
      where: { answer_id: "a-1" },
      data: { is_correct: true, points_awarded: 2 },
    });
  });

  it("marks a multiple-choice answer with no option selected wrong", async () => {
    arrange({
      questions: [mcq("q-1", 2)],
      answers: [chose("a-1", "q-1", null)],
    });

    await submit();

    expect(tx.answer.update).toHaveBeenCalledWith({
      where: { answer_id: "a-1" },
      data: { is_correct: false, points_awarded: 0 },
    });
  });

  it("writes nothing for an unanswered multiple-choice question, but still scores", async () => {
    arrange({ questions: [mcq("q-1")], answers: [] });

    await submit();

    expect(tx.answer.update).not.toHaveBeenCalled();
    expect(finalScore).toHaveBeenCalledTimes(1);
  });

  it("grades an attempt made only of multiple-choice questions", async () => {
    arrange({
      questions: [mcq("q-1")],
      answers: [chose("a-1", "q-1", "o-1")],
    });

    const result = await submit();

    expect(finalScore).toHaveBeenCalledWith("asm-1", "att-1", 70, tx);
    expect(updateStatus).toHaveBeenCalledWith(
      "att-1",
      expect.objectContaining({
        status: "GRADED",
        score_percentage: 80,
        passed: true,
        submitted_at: expect.any(Date),
        graded_at: expect.any(Date),
      }),
      tx
    );
    expect(result).toEqual({ attempt_id: "att-1" });
  });

  it("scores against the assessment's own pass mark", async () => {
    arrange({
      questions: [mcq("q-1")],
      answers: [chose("a-1", "q-1", "o-1")],
      passMark: 55,
    });

    await submit();

    expect(finalScore).toHaveBeenCalledWith("asm-1", "att-1", 55, tx);
  });

  it("sends an attempt with a manually-graded question to review, without scoring it", async () => {
    arrange({
      questions: [mcq("q-1"), manual("q-2")],
      answers: [chose("a-1", "q-1", "o-1")],
    });

    await submit();

    expect(updateStatus).toHaveBeenCalledWith(
      "att-1",
      { status: "PENDING_REVIEW", submitted_at: expect.any(Date) },
      tx
    );
    expect(finalScore).not.toHaveBeenCalled();
  });

  it("still auto-grades the multiple-choice answers when a manual question is present", async () => {
    arrange({
      questions: [mcq("q-1"), manual("q-2")],
      answers: [
        chose("a-1", "q-1", "o-1"),
        { answer_id: "a-2", question_id: "q-2", text_response: "My answer" },
      ],
    });

    await submit();

    expect(tx.answer.update).toHaveBeenCalledTimes(1);
    expect(tx.answer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { answer_id: "a-1" } })
    );
  });

  it("does everything inside one transaction", async () => {
    arrange({
      questions: [mcq("q-1")],
      answers: [chose("a-1", "q-1", "o-1")],
    });

    await submit();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("attemptService.getMyAttempts", () => {
  it("lists a student's attempts for an assessment", async () => {
    vi.mocked(attemptRepository.findByAssessmentAndStudent).mockResolvedValue([
      { attempt_id: "att-1" },
    ] as never);

    const result = await attemptService.getMyAttempts("asm-1", OWNER);

    expect(attemptRepository.findByAssessmentAndStudent).toHaveBeenCalledWith(
      "asm-1",
      OWNER
    );
    expect(result).toEqual([{ attempt_id: "att-1" }]);
  });
});