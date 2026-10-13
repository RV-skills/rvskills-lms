import { describe, expect, it, vi, beforeEach } from "vitest";
import { getPreviewCourse, previewChecks, toPreviewPlayer, type PreviewCourse, type PreviewLesson } from "../course-preview";
import { gatewayFetch, GatewayError } from "../gateway-client";

vi.mock("../gateway-client", async () => {
  const actual = await vi.importActual<typeof import("../gateway-client")>("../gateway-client");
  return { ...actual, gatewayFetch: vi.fn() };
});

const mockFetch = vi.mocked(gatewayFetch);

function lesson(id: string, extra: Partial<PreviewLesson> = {}): PreviewLesson {
  return {
    lesson_id: id,
    title: `Lesson ${id}`,
    is_preview: false,
    estimated_duration_mins: 5,
    content_type: "VIDEO" as const,
    video_url: `https://cdn.example.com/${id}.mp4`,
    description: null,
    resources: [],
    ...extra,
  };
}

function course(overrides: Partial<PreviewCourse> = {}): PreviewCourse {
  return {
    course_id: "c1",
    title: "Python",
    description: "Learn Python",
    thumbnail_url: null,
    difficulty: "beginner",
    instructorName: "Asha Rao",
    modules: [
      { module_id: "m1", title: "Intro", is_locked: false, lessons: [lesson("a"), lesson("b")] },
      { module_id: "m2", title: "Next", is_locked: false, lessons: [lesson("c")] },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPreviewCourse", () => {
  it("loads the course detail", async () => {
    mockFetch.mockResolvedValue(course());
    await expect(getPreviewCourse("c1")).resolves.toEqual(course());
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/c1");
  });

  it("returns null for a missing course", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Course not found", 404));
    await expect(getPreviewCourse("c1")).resolves.toBeNull();
  });
});

describe("toPreviewPlayer", () => {
  it("shows the course as a new student finds it", () => {
    const data = toPreviewPlayer(course())!;
    expect(data.courseTitle).toBe("Python");
    expect(data.currentLesson.lesson_id).toBe("a");
    expect(data.modules.map((m) => m.is_locked)).toEqual([false, true]);
    expect(data.modules.flatMap((m) => m.lessons.map((l) => l.status))).toEqual(["current", "upcoming", "upcoming"]);
  });

  it("keeps the content of locked modules so faculty can check it", () => {
    const data = toPreviewPlayer(course())!;
    expect(data.modules[1].lessons[0].video_url).toBe("https://cdn.example.com/c.mp4");
  });

  it("starts from the first lesson even when the first module is empty", () => {
    const data = toPreviewPlayer(
      course({ modules: [{ module_id: "m0", title: "Empty", is_locked: false, lessons: [] }, ...course().modules] })
    )!;
    expect(data.currentLesson.lesson_id).toBe("a");
  });

  it("returns null when there are no lessons", () => {
    expect(toPreviewPlayer(course({ modules: [] }))).toBeNull();
  });
});

describe("previewChecks", () => {
  it("is quiet for a complete course apart from the lock note", () => {
    expect(previewChecks(course()).filter((c) => c.level === "warning")).toEqual([]);
    expect(previewChecks(course()).some((c) => c.level === "info")).toBe(true);
  });

  it("flags missing description, empty modules and lessons with no content, but not quizzes", () => {
    const c = course({ description: null });
    c.modules[0].lessons[1] = lesson("b", { video_url: null });
    c.modules[1].lessons = [lesson("q", { content_type: "QUIZ", video_url: null })];
    c.modules.push({ module_id: "m3", title: "Later", is_locked: false, lessons: [] });

    expect(previewChecks(c).filter((x) => x.level === "warning").map((x) => x.message)).toEqual([
      "The course has no description.",
      'Lesson 1.2 "Lesson b" has no content yet. Students will see an empty screen.',
      'Module 3 "Later" has no lessons.',
    ]);
  });
});
