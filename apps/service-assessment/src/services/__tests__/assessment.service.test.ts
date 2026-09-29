import { describe, expect, it, vi } from "vitest";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@rv-lms/shared-utils";
import { assessmentService } from "../assessment.service";
import { courseServiceClient } from "../../clients/course-service.client";
import { assessmentRepository } from "../../repositories/assessment.repository";
import { questionRepository } from "../../repositories/question.repository";
import { attemptRepository } from "../../repositories/attempt.repository";

vi.mock("../../clients/course-service.client", () => ({
  courseServiceClient: { getCourse: vi.fn() },
}));

vi.mock("../../repositories/assessment.repository", () => ({
  assessmentRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdWithQuestions: vi.fn(),
    findManyByCourseId: vi.fn(),
  },
}));

vi.mock("../../repositories/question.repository", () => ({
  questionRepository: {
    findByAssessmentId: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../../repositories/attempt.repository", () => ({
  attemptRepository: {
    existsForAssessment: vi.fn(),
  },
}));

const getCourse = vi.mocked(courseServiceClient.getCourse);
const createAssessmentRow = vi.mocked(assessmentRepository.create);
const findAssessment = vi.mocked(assessmentRepository.findById);
const findWithQuestions = vi.mocked(assessmentRepository.findByIdWithQuestions);
const findQuestions = vi.mocked(questionRepository.findByAssessmentId);
const createQuestionRow = vi.mocked(questionRepository.create);
const findQuestion = vi.mocked(questionRepository.findById);
const updateQuestionRow = vi.mocked(questionRepository.update);

const hasAttempts = vi.mocked(attemptRepository.existsForAssessment);

type Option = { text: string; is_correct: boolean };

describe("assessmentService.createAssessment", () => {
  const base = {
    course_id: "course-1",
    tenant_id: "tenant-1",
    title: "Final Quiz",
    passing_percentage: 70,
  };

  it("checks that the course exists before creating", async () => {
    createAssessmentRow.mockResolvedValue({ assessment_id: "asm-1" } as never);

    await assessmentService.createAssessment(base);

    expect(getCourse).toHaveBeenCalledWith("course-1");
  });

  it("creates nothing when the course lookup fails", async () => {
    getCourse.mockRejectedValue(new NotFoundError("Course not found"));

    await expect(assessmentService.createAssessment(base)).rejects.toThrow(
      NotFoundError
    );
    expect(createAssessmentRow).not.toHaveBeenCalled();
  });

  it.each([-1, 101])("rejects a passing percentage of %i", async (pct) => {
    await expect(
      assessmentService.createAssessment({ ...base, passing_percentage: pct })
    ).rejects.toThrow(ValidationError);
    expect(createAssessmentRow).not.toHaveBeenCalled();
  });

  it.each([0, 100])("accepts a passing percentage of %i", async (pct) => {
    createAssessmentRow.mockResolvedValue({ assessment_id: "asm-1" } as never);

    await expect(
      assessmentService.createAssessment({ ...base, passing_percentage: pct })
    ).resolves.toEqual({ assessment_id: "asm-1" });
  });

  it("stores no attempt limit as null", async () => {
    createAssessmentRow.mockResolvedValue({ assessment_id: "asm-1" } as never);

    await assessmentService.createAssessment(base);

    expect(createAssessmentRow).toHaveBeenCalledWith({
      ...base,
      max_attempts: null,
    });
  });

  it("keeps an explicit attempt limit", async () => {
    createAssessmentRow.mockResolvedValue({ assessment_id: "asm-1" } as never);

    await assessmentService.createAssessment({ ...base, max_attempts: 3 });

    expect(createAssessmentRow).toHaveBeenCalledWith({
      ...base,
      max_attempts: 3,
    });
  });
});

describe("assessmentService.addQuestion", () => {
  const mcqOptions: Option[] = [
    { text: "Four", is_correct: true },
    { text: "Five", is_correct: false },
  ];

  function arrangeAssessment(existingQuestions = 0, options: { hasAttempts?: boolean } = {}) {
    findAssessment.mockResolvedValue({ assessment_id: "asm-1" } as never);
    findQuestions.mockResolvedValue(
      Array.from({ length: existingQuestions }, () => ({})) as never
    );
    hasAttempts.mockResolvedValue((options.hasAttempts ?? false) as never);
  }

  it("throws NotFoundError when the assessment does not exist", async () => {
    findAssessment.mockResolvedValue(null as never);

    await expect(
      assessmentService.addQuestion("asm-1", {
        type: "MCQ",
        prompt: "2 + 2?",
        options: mcqOptions,
      })
    ).rejects.toThrow(NotFoundError);
  });

  it.each([
    { label: "no options", options: [] as Option[] },
    { label: "one option", options: [{ text: "Only", is_correct: true }] },
  ])("rejects an MCQ with $label", async ({ options }) => {
    arrangeAssessment();

    await expect(
      assessmentService.addQuestion("asm-1", {
        type: "MCQ",
        prompt: "?",
        options,
      })
    ).rejects.toThrow(ValidationError);
    expect(createQuestionRow).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "no correct option",
      options: [
        { text: "A", is_correct: false },
        { text: "B", is_correct: false },
      ],
    },
    {
      label: "two correct options",
      options: [
        { text: "A", is_correct: true },
        { text: "B", is_correct: true },
      ],
    },
  ])("rejects an MCQ with $label", async ({ options }) => {
    arrangeAssessment();

    await expect(
      assessmentService.addQuestion("asm-1", {
        type: "MCQ",
        prompt: "?",
        options,
      })
    ).rejects.toThrow(ValidationError);
    expect(createQuestionRow).not.toHaveBeenCalled();
  });

  it("accepts an MCQ with exactly one correct option and stores its options", async () => {
    arrangeAssessment();
    createQuestionRow.mockResolvedValue({ question_id: "q-1" } as never);

    const result = await assessmentService.addQuestion("asm-1", {
      type: "MCQ",
      prompt: "2 + 2?",
      points: 2,
      options: mcqOptions,
    });

    expect(createQuestionRow).toHaveBeenCalledWith({
      assessment_id: "asm-1",
      type: "MCQ",
      prompt: "2 + 2?",
      points: 2,
      order_index: 0,
      options: mcqOptions,
    });
    expect(result).toEqual({ question_id: "q-1" });
  });

  it("places a new question after the existing ones", async () => {
    arrangeAssessment(3);
    createQuestionRow.mockResolvedValue({ question_id: "q-4" } as never);

    await assessmentService.addQuestion("asm-1", {
      type: "MCQ",
      prompt: "?",
      options: mcqOptions,
    });

    expect(createQuestionRow).toHaveBeenCalledWith(
      expect.objectContaining({ order_index: 3 })
    );
  });

  it("does not validate or store options for a manually-graded question", async () => {
    arrangeAssessment();
    createQuestionRow.mockResolvedValue({ question_id: "q-1" } as never);

    await assessmentService.addQuestion("asm-1", {
      type: "MANUAL",
      prompt: "Explain caching.",
      points: 5,
      options: [],
    });

    expect(createQuestionRow).toHaveBeenCalledWith({
      assessment_id: "asm-1",
      type: "MANUAL",
      prompt: "Explain caching.",
      points: 5,
      order_index: 0,
      options: undefined,
    });
  });

  it("refuses a new question once a student has started an attempt", async () => {
    arrangeAssessment(1, { hasAttempts: true });

    await expect(
      assessmentService.addQuestion("asm-1", {
        type: "MCQ",
        prompt: "New question",
        options: mcqOptions,
      })
    ).rejects.toThrow(ForbiddenError);
    expect(createQuestionRow).not.toHaveBeenCalled();
  });

  it("still allows a new question before anyone has attempted the assessment", async () => {
    arrangeAssessment(1, { hasAttempts: false });
    createQuestionRow.mockResolvedValue({ question_id: "q-2" } as never);

    await expect(
      assessmentService.addQuestion("asm-1", {
        type: "MCQ",
        prompt: "New question",
        options: mcqOptions,
      })
    ).resolves.toEqual({ question_id: "q-2" });
  });
});

describe("assessmentService.updateQuestion", () => {
  it("throws NotFoundError when the question does not exist", async () => {
    findQuestion.mockResolvedValue(null as never);

    await expect(
      assessmentService.updateQuestion("q-1", { prompt: "New" })
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError once a student has attempted the assessment", async () => {
    findQuestion.mockResolvedValue({
      question_id: "q-1",
      is_locked: true,
    } as never);

    await expect(
      assessmentService.updateQuestion("q-1", { prompt: "New" })
    ).rejects.toThrow(ForbiddenError);
    expect(updateQuestionRow).not.toHaveBeenCalled();
  });

  it("updates a question that is not locked", async () => {
    findQuestion.mockResolvedValue({
      question_id: "q-1",
      is_locked: false,
    } as never);
    updateQuestionRow.mockResolvedValue({ question_id: "q-1" } as never);

    const result = await assessmentService.updateQuestion("q-1", {
      prompt: "New",
      points: 3,
    });

    expect(updateQuestionRow).toHaveBeenCalledWith("q-1", {
      prompt: "New",
      points: 3,
    });
    expect(result).toEqual({ question_id: "q-1" });
  });
});

describe("assessmentService.getAssessmentForStudent", () => {
  it("throws NotFoundError when the assessment does not exist", async () => {
    findWithQuestions.mockResolvedValue(null as never);

    await expect(
      assessmentService.getAssessmentForStudent("asm-1")
    ).rejects.toThrow(NotFoundError);
  });

  it("never reveals which option is correct", async () => {
    findWithQuestions.mockResolvedValue({
      assessment_id: "asm-1",
      title: "Quiz",
      questions: [
        {
          question_id: "q-1",
          prompt: "2 + 2?",
          points: 1,
          options: [
            { option_id: "o-1", text: "4", is_correct: true, question_id: "q-1" },
            { option_id: "o-2", text: "5", is_correct: false, question_id: "q-1" },
          ],
        },
      ],
    } as never);

    const result = await assessmentService.getAssessmentForStudent("asm-1");

    expect(result.questions[0].options).toEqual([
      { option_id: "o-1", text: "4" },
      { option_id: "o-2", text: "5" },
    ]);
    expect(JSON.stringify(result)).not.toContain("is_correct");
  });

  it("keeps the rest of the assessment and question details", async () => {
    findWithQuestions.mockResolvedValue({
      assessment_id: "asm-1",
      title: "Quiz",
      questions: [{ question_id: "q-1", prompt: "2 + 2?", points: 1, options: [] }],
    } as never);

    const result = await assessmentService.getAssessmentForStudent("asm-1");

    expect(result).toMatchObject({ assessment_id: "asm-1", title: "Quiz" });
    expect(result.questions[0]).toMatchObject({
      question_id: "q-1",
      prompt: "2 + 2?",
      points: 1,
    });
  });
});

describe("assessmentService.getAssessmentFull", () => {
  it("throws NotFoundError when the assessment does not exist", async () => {
    findWithQuestions.mockResolvedValue(null as never);

    await expect(assessmentService.getAssessmentFull("asm-1")).rejects.toThrow(
      NotFoundError
    );
  });

  it("returns everything, including which options are correct", async () => {
    const full = {
      assessment_id: "asm-1",
      questions: [
        { question_id: "q-1", options: [{ option_id: "o-1", is_correct: true }] },
      ],
    };
    findWithQuestions.mockResolvedValue(full as never);

    await expect(assessmentService.getAssessmentFull("asm-1")).resolves.toEqual(
      full
    );
  });
});

describe("assessmentService.getAssessmentsForCourse", () => {
  it("lists a course's assessments within a tenant", async () => {
    vi.mocked(assessmentRepository.findManyByCourseId).mockResolvedValue([
      { assessment_id: "asm-1" },
    ] as never);

    const result = await assessmentService.getAssessmentsForCourse(
      "course-1",
      "tenant-1"
    );

    expect(assessmentRepository.findManyByCourseId).toHaveBeenCalledWith(
      "course-1",
      "tenant-1"
    );
    expect(result).toEqual([{ assessment_id: "asm-1" }]);
  });
});