import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createCourseFromDraft,
  creationSteps,
  emptyCreationState,
  formatMinutes,
  hasErrors,
  move,
  outlineIssues,
  outlineStats,
  parseDuration,
  type DraftCourse,
} from "../course-outline";
import { createCourse, createModule, createLesson } from "../faculty";

vi.mock("../faculty", () => ({
  createCourse: vi.fn(),
  createModule: vi.fn(),
  createLesson: vi.fn(),
}));

const mockCourse = vi.mocked(createCourse);
const mockModule = vi.mocked(createModule);
const mockLesson = vi.mocked(createLesson);

function draft(overrides: Partial<DraftCourse> = {}): DraftCourse {
  return {
    title: "Python Basics",
    description: "Intro",
    difficulty: "beginner",
    modules: [
      {
        key: "m1",
        title: "Introduction",
        lessons: [
          { key: "l1", title: "What is Python", content_type: "VIDEO", duration: "8" },
          { key: "l2", title: "Setup", content_type: "PDF", duration: "" },
        ],
      },
      { key: "m2", title: "Variables", lessons: [{ key: "l3", title: "Names", content_type: "VIDEO", duration: "12" }] },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseDuration", () => {
  it("treats blank as unknown", () => {
    expect(parseDuration("  ")).toBeNull();
  });
  it("accepts whole positive minutes", () => {
    expect(parseDuration(" 15 ")).toBe(15);
  });
  it("rejects zero, decimals and text", () => {
    expect(parseDuration("0")).toBe("invalid");
    expect(parseDuration("1.5")).toBe("invalid");
    expect(parseDuration("ten")).toBe("invalid");
    expect(parseDuration("-3")).toBe("invalid");
  });
});

describe("formatMinutes", () => {
  it("formats minutes and hours", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(95)).toBe("1 h 35 min");
  });
});

describe("outlineStats", () => {
  it("counts modules, lessons, minutes and types", () => {
    const s = outlineStats(draft());
    expect(s).toEqual({
      modules: 2,
      lessons: 3,
      totalMins: 20,
      lessonsWithoutDuration: 1,
      byType: { VIDEO: 2, PDF: 1 },
    });
  });
});

describe("outlineIssues", () => {
  it("has no errors for a complete plan", () => {
    expect(hasErrors(outlineIssues(draft()))).toBe(false);
  });

  it("blocks a short course title", () => {
    const issues = outlineIssues(draft({ title: "Py" }));
    expect(issues).toContainEqual({ level: "error", message: "Course title needs at least 3 characters." });
  });

  it("blocks blank module and lesson titles and bad durations, numbered by position", () => {
    const d = draft();
    d.modules[1].title = " ";
    d.modules[0].lessons[1].title = "";
    d.modules[0].lessons[0].duration = "abc";
    const messages = outlineIssues(d).filter((i) => i.level === "error").map((i) => i.message);
    expect(messages).toEqual([
      "Lesson 1.1 duration must be a whole number of minutes.",
      "Lesson 1.2 has no title.",
      "Module 2 has no title.",
    ]);
  });

  it("warns, without blocking, about empty modules and an empty syllabus", () => {
    const empty = outlineIssues(draft({ modules: [] }));
    expect(hasErrors(empty)).toBe(false);
    expect(empty.map((i) => i.message)).toContain("No modules yet. Students will see an empty syllabus.");

    const d = draft();
    d.modules[1].lessons = [];
    expect(outlineIssues(d)).toContainEqual({ level: "warning", message: 'Module 2 "Variables" has no lessons.' });
  });

  it("warns when no lesson has a duration", () => {
    const d = draft();
    d.modules.forEach((m) => m.lessons.forEach((l) => (l.duration = "")));
    expect(outlineIssues(d).some((i) => i.message.startsWith("No lesson has a duration"))).toBe(true);
  });
});

describe("move", () => {
  it("swaps with the neighbour", () => {
    expect(move(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(move(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });
  it("ignores moves past either end", () => {
    const list = ["a", "b"];
    expect(move(list, 0, -1)).toBe(list);
    expect(move(list, 1, 1)).toBe(list);
  });
});

describe("createCourseFromDraft", () => {
  it("creates the course, then modules and lessons in order, trimming and skipping blank durations", async () => {
    mockCourse.mockResolvedValue({ course_id: "c1" } as never);
    mockModule.mockResolvedValueOnce({ module_id: "M1" } as never).mockResolvedValueOnce({ module_id: "M2" } as never);
    mockLesson.mockResolvedValue({} as never);
    const progress = vi.fn();

    const d = draft({ title: "  Python Basics  ", description: "  " });
    const id = await createCourseFromDraft(d, emptyCreationState(), progress);

    expect(id).toBe("c1");
    expect(mockCourse).toHaveBeenCalledWith({ title: "Python Basics", description: undefined, difficulty: "beginner" });
    expect(mockModule.mock.calls).toEqual([
      ["c1", { title: "Introduction" }],
      ["c1", { title: "Variables" }],
    ]);
    expect(mockLesson.mock.calls).toEqual([
      ["c1", "M1", { title: "What is Python", content_type: "VIDEO", estimated_duration_mins: 8 }],
      ["c1", "M1", { title: "Setup", content_type: "PDF" }],
      ["c1", "M2", { title: "Names", content_type: "VIDEO", estimated_duration_mins: 12 }],
    ]);
    expect(progress).toHaveBeenLastCalledWith({ done: creationSteps(d), total: 6, label: "Done" });
  });

  it("resumes after a failure without creating anything twice", async () => {
    mockCourse.mockResolvedValue({ course_id: "c1" } as never);
    mockModule.mockResolvedValueOnce({ module_id: "M1" } as never).mockResolvedValueOnce({ module_id: "M2" } as never);
    mockLesson
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({} as never);

    const d = draft();
    const state = emptyCreationState();
    await expect(createCourseFromDraft(d, state, () => {})).rejects.toThrow("network");
    expect(state).toEqual({ courseId: "c1", moduleIds: { m1: "M1" }, createdLessons: { l1: true } });

    await createCourseFromDraft(d, state, () => {});
    expect(mockCourse).toHaveBeenCalledTimes(1);
    expect(mockModule).toHaveBeenCalledTimes(2);
    expect(mockLesson.mock.calls.map((c) => c[2].title)).toEqual(["What is Python", "Setup", "Setup", "Names"]);
  });
});
