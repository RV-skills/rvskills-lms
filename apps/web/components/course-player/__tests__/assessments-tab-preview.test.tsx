// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssessmentsTab, toStudentView } from "../assessments-tab";
import { listAssessmentsForCourse, getAssessment, startAttempt, getMyAttempts, submitAnswer, submitAttempt } from "@/lib/assessment";
import { getAssessmentFull } from "@/lib/assessment-authoring";

vi.mock("@/lib/assessment", () => ({
  getMyAttempts: vi.fn(),
  listAssessmentsForCourse: vi.fn(),
  getAssessment: vi.fn(),
  startAttempt: vi.fn(),
  submitAnswer: vi.fn(),
  submitAttempt: vi.fn(),
}));

vi.mock("@/lib/assessment-authoring", () => ({
  getAssessmentFull: vi.fn(),
}));

const FULL = {
  assessment_id: "asm-1",
  course_id: "course-1",
  title: "Final Quiz",
  passing_percentage: 70,
  max_attempts: 3,
  questions: [
    {
      question_id: "q-2",
      type: "MANUAL" as const,
      prompt: "Explain closures",
      points: 10,
      order_index: 1,
      is_locked: false,
      options: [],
    },
    {
      question_id: "q-1",
      type: "MCQ" as const,
      prompt: "What is 2 + 2?",
      points: 5,
      order_index: 0,
      is_locked: false,
      options: [
        { option_id: "o-1", text: "3", is_correct: false },
        { option_id: "o-2", text: "4", is_correct: true },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listAssessmentsForCourse).mockResolvedValue([
    { assessment_id: "asm-1", course_id: "course-1", title: "Final Quiz", passing_percentage: 70, max_attempts: 3 },
  ]);
  vi.mocked(getAssessmentFull).mockResolvedValue(FULL);
});

describe("toStudentView", () => {
  it("drops the correct answers and orders the questions", () => {
    const view = toStudentView(FULL);
    expect(view.questions.map((q) => q.question_id)).toEqual(["q-1", "q-2"]);
    expect(view.questions[0].options).toEqual([
      { option_id: "o-1", text: "3" },
      { option_id: "o-2", text: "4" },
    ]);
  });
});

describe("AssessmentsTab in preview", () => {
  it("shows the questions without starting an attempt or loading attempts", async () => {
    render(<AssessmentsTab courseId="course-1" preview />);
    expect(await screen.findByText("Final Quiz")).toBeTruthy();
    expect(screen.getByText(/0 of 3 attempts used/)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(await screen.findByText(/What is 2 \+ 2\?/)).toBeTruthy();
    expect(screen.getByText(/Explain closures/)).toBeTruthy();
    expect(screen.getByText(/Answers can't be submitted here/)).toBeTruthy();
    expect(getMyAttempts).not.toHaveBeenCalled();
    expect(startAttempt).not.toHaveBeenCalled();
    expect(getAssessment).not.toHaveBeenCalled();
  });

  it("never submits, even after answering", async () => {
    render(<AssessmentsTab courseId="course-1" preview />);
    await userEvent.click(await screen.findByRole("button", { name: "Start" }));
    await userEvent.click(await screen.findByLabelText("4"));

    const submit = screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    await userEvent.click(submit);
    expect(submitAnswer).not.toHaveBeenCalled();
    expect(submitAttempt).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("button", { name: "Start" })).toBeTruthy();
  });
});
