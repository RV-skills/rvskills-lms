// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssessmentsTab } from "../assessments-tab";
import {
  listAssessmentsForCourse,
  getAssessment,
  startAttempt,
  submitAnswer,
  submitAttempt,
} from "@/lib/assessment";
import { GatewayError } from "@/lib/gateway-client";

vi.mock("@/lib/assessment", () => ({
  listAssessmentsForCourse: vi.fn(),
  getAssessment: vi.fn(),
  startAttempt: vi.fn(),
  submitAnswer: vi.fn(),
  submitAttempt: vi.fn(),
}));

const mockList = vi.mocked(listAssessmentsForCourse);
const mockGetAssessment = vi.mocked(getAssessment);
const mockStartAttempt = vi.mocked(startAttempt);
const mockSubmitAnswer = vi.mocked(submitAnswer);
const mockSubmitAttempt = vi.mocked(submitAttempt);

const ASSESSMENT_SUMMARY = {
  assessment_id: "asm-1",
  course_id: "course-1",
  title: "Final Quiz",
  passing_percentage: 70,
  max_attempts: 3,
};

const ASSESSMENT_DETAIL = {
  assessment_id: "asm-1",
  course_id: "course-1",
  title: "Final Quiz",
  passing_percentage: 70,
  max_attempts: 3,
  questions: [
    {
      question_id: "q-1",
      type: "MCQ" as const,
      prompt: "What is 2 + 2?",
      points: 5,
      order_index: 0,
      options: [
        { option_id: "o-1", text: "3" },
        { option_id: "o-2", text: "4" },
      ],
    },
  ],
};

const ATTEMPT = {
  attempt_id: "att-1",
  assessment_id: "asm-1",
  attempt_number: 1,
  status: "IN_PROGRESS" as const,
  score_percentage: null,
  passed: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AssessmentsTab: list view", () => {
  it("shows a loading message before the list resolves", () => {
    mockList.mockReturnValue(new Promise(() => {}));
    render(<AssessmentsTab courseId="course-1" />);
    expect(screen.getByText(/loading assessments/i)).toBeInTheDocument();
  });

  it("shows an empty message when there are no assessments", async () => {
    mockList.mockResolvedValue([]);
    render(<AssessmentsTab courseId="course-1" />);
    await waitFor(() =>
      expect(screen.getByText(/no assessments have been added/i)).toBeInTheDocument()
    );
  });

  it("lists each assessment with its passing score and attempt limit", async () => {
    mockList.mockResolvedValue([ASSESSMENT_SUMMARY]);
    render(<AssessmentsTab courseId="course-1" />);

    await waitFor(() => expect(screen.getByText("Final Quiz")).toBeInTheDocument());
    expect(screen.getByText(/passing score: 70%/i)).toBeInTheDocument();
    expect(screen.getByText(/3 attempts allowed/i)).toBeInTheDocument();
  });

  it("omits the attempts text when max_attempts is null", async () => {
    mockList.mockResolvedValue([{ ...ASSESSMENT_SUMMARY, max_attempts: null }]);
    render(<AssessmentsTab courseId="course-1" />);

    await waitFor(() => expect(screen.getByText("Final Quiz")).toBeInTheDocument());
    expect(screen.queryByText(/attempts allowed/i)).not.toBeInTheDocument();
  });
});

describe("AssessmentsTab: starting an attempt", () => {
  it("switches to the quiz view on a successful start", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([ASSESSMENT_SUMMARY]);
    mockGetAssessment.mockResolvedValue(ASSESSMENT_DETAIL);
    mockStartAttempt.mockResolvedValue(ATTEMPT);
    render(<AssessmentsTab courseId="course-1" />);

    await waitFor(() => expect(screen.getByText("Final Quiz")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /start/i }));

    await waitFor(() => expect(screen.getByText(/what is 2 \+ 2/i)).toBeInTheDocument());
    expect(mockGetAssessment).toHaveBeenCalledWith("asm-1");
    expect(mockStartAttempt).toHaveBeenCalledWith("asm-1");
  });

  it("shows the GatewayError's own message when starting fails", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([ASSESSMENT_SUMMARY]);
    mockGetAssessment.mockRejectedValue(new GatewayError("You have used all 3 attempts", 409));
    render(<AssessmentsTab courseId="course-1" />);

    await waitFor(() => expect(screen.getByText("Final Quiz")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /start/i }));

    await waitFor(() =>
      expect(screen.getByText("You have used all 3 attempts")).toBeInTheDocument()
    );
  });

  it("shows a generic message for a non-GatewayError failure while starting", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([ASSESSMENT_SUMMARY]);
    mockGetAssessment.mockRejectedValue(new Error("network down"));
    render(<AssessmentsTab courseId="course-1" />);

    await waitFor(() => expect(screen.getByText("Final Quiz")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /start/i }));

    await waitFor(() =>
      expect(screen.getByText(/something went wrong. please try again/i)).toBeInTheDocument()
    );
  });
});

describe("AssessmentsTab: taking and submitting the quiz", () => {
  async function startQuiz(user: ReturnType<typeof userEvent.setup>) {
    mockList.mockResolvedValue([ASSESSMENT_SUMMARY]);
    mockGetAssessment.mockResolvedValue(ASSESSMENT_DETAIL);
    mockStartAttempt.mockResolvedValue(ATTEMPT);
    render(<AssessmentsTab courseId="course-1" />);
    await waitFor(() => expect(screen.getByText("Final Quiz")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(screen.getByText(/what is 2 \+ 2/i)).toBeInTheDocument());
  }

  it("only one MCQ option is checked at a time", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    const three = screen.getByRole("radio", { name: "3" });
    const four = screen.getByRole("radio", { name: "4" });

    await user.click(three);
    expect(three).toBeChecked();
    expect(four).not.toBeChecked();

    await user.click(four);
    expect(four).toBeChecked();
    expect(three).not.toBeChecked();
  });

  it("submits an answer for the selected option, then submits the attempt, and shows the graded result", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    await user.click(screen.getByRole("radio", { name: "4" }));
    mockSubmitAnswer.mockResolvedValue(undefined);
    mockSubmitAttempt.mockResolvedValue({
      ...ATTEMPT,
      status: "GRADED",
      score_percentage: 100,
      passed: true,
    });

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => expect(screen.getByText("100%")).toBeInTheDocument());
    expect(mockSubmitAnswer).toHaveBeenCalledWith("att-1", {
      question_id: "q-1",
      selected_option_id: "o-2",
    });
    expect(mockSubmitAttempt).toHaveBeenCalledWith("att-1");
    expect(screen.getByText(/passed/i)).toBeInTheDocument();
  });

  it("shows a manual-review message, not a score, when the attempt is PENDING_REVIEW", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    mockSubmitAnswer.mockResolvedValue(undefined);
    mockSubmitAttempt.mockResolvedValue({ ...ATTEMPT, status: "PENDING_REVIEW" });

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => expect(screen.getByText(/need manual grading/i)).toBeInTheDocument());
    expect(screen.queryByText("%")).not.toBeInTheDocument();
  });

  it("returning to the list from the result view reloads the assessments", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    mockSubmitAnswer.mockResolvedValue(undefined);
    mockSubmitAttempt.mockResolvedValue({ ...ATTEMPT, status: "PENDING_REVIEW" });
    await user.click(screen.getByRole("button", { name: /^submit$/i }));
    await waitFor(() => expect(screen.getByText(/need manual grading/i)).toBeInTheDocument());

    mockList.mockClear();
    mockList.mockResolvedValue([ASSESSMENT_SUMMARY]);
    await user.click(screen.getByRole("button", { name: /back to assessments/i }));

    await waitFor(() => expect(mockList).toHaveBeenCalled());
  });

  it("cancelling out of the quiz goes back to the list without submitting anything", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(screen.getByText("Final Quiz")).toBeInTheDocument());
    expect(mockSubmitAnswer).not.toHaveBeenCalled();
    expect(mockSubmitAttempt).not.toHaveBeenCalled();
  });
});
