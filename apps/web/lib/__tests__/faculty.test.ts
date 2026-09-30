import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  listMyCourses,
  createCourse,
  getFacultyCourseDetail,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  updateCourseDetails,
  setLessonVideo,
  removeLessonVideo,
  addLessonResource,
  removeLessonResource,
} from "../faculty";
import { gatewayFetch, GatewayError } from "../gateway-client";

vi.mock("../gateway-client", async () => {
  const actual = await vi.importActual<typeof import("../gateway-client")>("../gateway-client");
  return { ...actual, gatewayFetch: vi.fn() };
});

const mockFetch = vi.mocked(gatewayFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listMyCourses / createCourse", () => {
  it("listMyCourses gets /courses/mine", async () => {
    mockFetch.mockResolvedValue([] as never);
    await listMyCourses();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/mine");
  });

  it("createCourse posts the given fields", async () => {
    mockFetch.mockResolvedValue({ course_id: "course-1" } as never);
    const data = { title: "New Course", difficulty: "beginner" };

    await createCourse(data);

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });
});

describe("getFacultyCourseDetail", () => {
  it("returns the course on success", async () => {
    mockFetch.mockResolvedValue({ course_id: "course-1" } as never);

    await expect(getFacultyCourseDetail("course-1")).resolves.toEqual({ course_id: "course-1" });
  });

  it("returns null, not an error, for a real 404", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Not found", 404));

    await expect(getFacultyCourseDetail("missing")).resolves.toBeNull();
  });

  it("rethrows any other GatewayError instead of swallowing it as null", async () => {
    mockFetch.mockRejectedValue(new GatewayError("Forbidden", 403));

    await expect(getFacultyCourseDetail("course-1")).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rethrows a non-GatewayError too", async () => {
    mockFetch.mockRejectedValue(new Error("network failure"));

    await expect(getFacultyCourseDetail("course-1")).rejects.toThrow("network failure");
  });
});

describe("module management", () => {
  it("createModule posts to the course's modules endpoint", async () => {
    mockFetch.mockResolvedValue({ module_id: "mod-1" } as never);
    const data = { title: "Module 1" };

    await createModule("course-1", data);

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/modules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("updateModule PATCHes the specific module", async () => {
    mockFetch.mockResolvedValue({ module_id: "mod-1" } as never);
    const data = { title: "Renamed" };

    await updateModule("course-1", "mod-1", data);

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/modules/mod-1", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  });

  it("deleteModule DELETEs the specific module", async () => {
    mockFetch.mockResolvedValue(undefined as never);

    await deleteModule("course-1", "mod-1");

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/modules/mod-1", { method: "DELETE" });
  });
});

describe("lesson management", () => {
  it("createLesson posts to the module's lessons endpoint", async () => {
    mockFetch.mockResolvedValue({ lesson_id: "l-1" } as never);
    const data = { title: "Lesson 1", content_type: "VIDEO" };

    await createLesson("course-1", "mod-1", data);

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/modules/mod-1/lessons", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("updateLesson PATCHes the specific lesson", async () => {
    mockFetch.mockResolvedValue({ lesson_id: "l-1" } as never);
    const data = { title: "Renamed" };

    await updateLesson("course-1", "mod-1", "l-1", data);

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1/modules/mod-1/lessons/l-1", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  });

  it("deleteLesson DELETEs the specific lesson", async () => {
    mockFetch.mockResolvedValue(undefined as never);

    await deleteLesson("course-1", "mod-1", "l-1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/courses/course-1/modules/mod-1/lessons/l-1",
      { method: "DELETE" }
    );
  });
});

describe("updateCourseDetails", () => {
  it("PATCHes the course with the given fields", async () => {
    mockFetch.mockResolvedValue({ course_id: "course-1" } as never);
    const data = { title: "Renamed" };

    await updateCourseDetails("course-1", data);

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/courses/course-1", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  });
});

describe("video and resource management", () => {
  it("setLessonVideo PUTs the video_url, wrapped in an object", async () => {
    mockFetch.mockResolvedValue({ lesson_id: "l-1" } as never);

    await setLessonVideo("course-1", "mod-1", "l-1", "/videos/a.mp4");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/courses/course-1/modules/mod-1/lessons/l-1/video",
      { method: "PUT", body: JSON.stringify({ video_url: "/videos/a.mp4" }) }
    );
  });

  it("removeLessonVideo DELETEs the video endpoint", async () => {
    mockFetch.mockResolvedValue({ lesson_id: "l-1" } as never);

    await removeLessonVideo("course-1", "mod-1", "l-1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/courses/course-1/modules/mod-1/lessons/l-1/video",
      { method: "DELETE" }
    );
  });

  it("addLessonResource posts the title and pdf_url", async () => {
    mockFetch.mockResolvedValue({ lesson_id: "l-1" } as never);

    await addLessonResource("course-1", "mod-1", "l-1", "Slides", "/resources/a.pdf");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/courses/course-1/modules/mod-1/lessons/l-1/resources",
      { method: "POST", body: JSON.stringify({ title: "Slides", pdf_url: "/resources/a.pdf" }) }
    );
  });

  it("removeLessonResource DELETEs the specific resource", async () => {
    mockFetch.mockResolvedValue({ lesson_id: "l-1" } as never);

    await removeLessonResource("course-1", "mod-1", "l-1", "r-1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/courses/course-1/modules/mod-1/lessons/l-1/resources/r-1",
      { method: "DELETE" }
    );
  });
});