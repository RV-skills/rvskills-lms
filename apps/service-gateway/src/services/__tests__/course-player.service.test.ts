import { describe, expect, it, vi, beforeEach } from "vitest";
import { ValidationError } from "@rv-lms/shared-utils";
import { getCoursePlayerData } from "../course-player.service";
import { getCourseDetail } from "../courses.service";
import { getCompletedLessonIds, getMyEnrollments } from "../enrollment.service";

vi.mock("../courses.service", () => ({ getCourseDetail: vi.fn() }));
vi.mock("../enrollment.service", () => ({
  getMyEnrollments: vi.fn(),
  getCompletedLessonIds: vi.fn(),
}));

const mockDetail = vi.mocked(getCourseDetail);
const mockEnrollments = vi.mocked(getMyEnrollments);
const mockCompleted = vi.mocked(getCompletedLessonIds);

function aLesson(id: string) {
  return {
    lesson_id: id,
    title: `Lesson ${id}`,
    content_type: "VIDEO",
    is_preview: false,
    estimated_duration_mins: 10,
    video_url: `https://cdn.example.com/${id}.mp4`,
    description: null,
    resources: [{ resource_id: `r-${id}`, title: "Notes", resource_type: "PDF", file_url: `https://cdn.example.com/${id}.pdf` }],
  };
}

// Two modules: m-1 (lessons a, b) and m-2 (lesson c). m-2 unlocks once all of m-1 is done.
function aCourse() {
  return {
    course_id: "course-1",
    title: "System Design",
    modules: [
      { module_id: "m-1", title: "Basics", is_locked: false, lessons: [aLesson("a"), aLesson("b")] },
      { module_id: "m-2", title: "Advanced", is_locked: false, lessons: [aLesson("c")] },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDetail.mockResolvedValue(aCourse() as never);
  mockEnrollments.mockResolvedValue([{ course_id: "course-1", enrollment_id: "e-1" }] as never);
  mockCompleted.mockResolvedValue([]);
});

describe("getCoursePlayerData", () => {
  it("sends content links for lessons in an unlocked module", async () => {
    const data = await getCoursePlayerData("course-1", "token");
    const lessonA = data!.modules[0].lessons[0];

    expect(data!.modules[0].is_locked).toBe(false);
    expect(lessonA.video_url).toBe("https://cdn.example.com/a.mp4");
    expect(lessonA.resources).toHaveLength(1);
  });

  it("withholds content links for lessons in a locked module", async () => {
    const data = await getCoursePlayerData("course-1", "token");
    const lessonC = data!.modules[1].lessons[0];

    expect(data!.modules[1].is_locked).toBe(true);
    expect(lessonC.video_url).toBeNull();
    expect(lessonC.resources).toEqual([]);
  });

  it("still shows a locked lesson's title and status, so the outline stays complete", async () => {
    const data = await getCoursePlayerData("course-1", "token");
    const lessonC = data!.modules[1].lessons[0];

    expect(lessonC.title).toBe("Lesson c");
    expect(lessonC.status).toBe("upcoming");
  });

  it("releases a module's links once every lesson in the module before it is complete", async () => {
    mockCompleted.mockResolvedValue(["a", "b"]);

    const data = await getCoursePlayerData("course-1", "token");
    const lessonC = data!.modules[1].lessons[0];

    expect(data!.modules[1].is_locked).toBe(false);
    expect(lessonC.video_url).toBe("https://cdn.example.com/c.mp4");
  });

  it("keeps the next module locked while the previous one is only partly done", async () => {
    mockCompleted.mockResolvedValue(["a"]);

    const data = await getCoursePlayerData("course-1", "token");

    expect(data!.modules[1].is_locked).toBe(true);
    expect(data!.modules[1].lessons[0].video_url).toBeNull();
  });

  it("opens on a lesson that has its content, never a locked one", async () => {
    mockCompleted.mockResolvedValue(["a"]);

    const data = await getCoursePlayerData("course-1", "token");

    expect(data!.currentLesson.lesson_id).toBe("b");
    expect(data!.currentLesson.video_url).toBe("https://cdn.example.com/b.mp4");
  });

  it("refuses a student who is not enrolled", async () => {
    mockEnrollments.mockResolvedValue([] as never);

    await expect(getCoursePlayerData("course-1", "token")).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns null when the course does not exist", async () => {
    mockDetail.mockResolvedValue(null);

    expect(await getCoursePlayerData("course-1", "token")).toBeNull();
  });
});