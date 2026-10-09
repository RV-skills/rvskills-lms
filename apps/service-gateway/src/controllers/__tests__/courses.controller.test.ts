import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { NotFoundError } from "@rv-lms/shared-utils";
import {
  listCoursesController,
  getCourseDetailController,
  listCourseRatingsController,
  getAverageRatingController,
  submitRatingController,
  updateRatingController,
  markLessonCompleteController,
  listCoursesForAdminController,
  publishCourseController,
  unpublishCourseController,
  listCourseFacultyController,
  assignCourseFacultyController,
  removeCourseFacultyController,
  listMyCoursesController,
  createCourseController,
  createModuleController,
  updateModuleController,
  deleteModuleController,
  createLessonController,
  updateLessonController,
  deleteLessonController,
  updateCourseController,
  setLessonVideoController,
  removeLessonVideoController,
  addLessonResourceController,
  removeLessonResourceController,
} from "../courses.controller";
import * as coursesService from "../../services/courses.service";
import * as enrollmentService from "../../services/enrollment.service";

vi.mock("../../services/courses.service", () => ({
  listCourses: vi.fn(),
  getCourseDetail: vi.fn(),
  getCourseDetailForViewer: vi.fn(),
  createCourse: vi.fn(),
  listMyCourses: vi.fn(),
  listCoursesForAdmin: vi.fn(),
  publishCourse: vi.fn(),
  unpublishCourse: vi.fn(),
  listCourseFaculty: vi.fn(),
  assignCourseFaculty: vi.fn(),
  removeCourseFaculty: vi.fn(),
  createModule: vi.fn(),
  updateModule: vi.fn(),
  deleteModule: vi.fn(),
  createLesson: vi.fn(),
  updateLesson: vi.fn(),
  deleteLesson: vi.fn(),
  updateCourseDetails: vi.fn(),
  setLessonVideo: vi.fn(),
  removeLessonVideo: vi.fn(),
  addLessonResource: vi.fn(),
  removeLessonResource: vi.fn(),
}));

vi.mock("../../services/enrollment.service", () => ({
  listCourseRatings: vi.fn(),
  getAverageRating: vi.fn(),
  submitRating: vi.fn(),
  updateRating: vi.fn(),
  markLessonComplete: vi.fn(),
}));

const courses = vi.mocked(coursesService);
const enrollment = vi.mocked(enrollmentService);

const TOKEN = "Bearer test-token";

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

function fakeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return { body: {}, params: {}, accessToken: TOKEN, ...overrides } as unknown as AuthenticatedRequest;
}

const next = vi.fn() as unknown as NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listCoursesController", () => {
  it("works for a visitor with no access token", async () => {
    courses.listCourses.mockResolvedValue([{ course_id: "course-1" }] as never);
    const req = fakeReq({ accessToken: undefined });
    const res = fakeRes();

    await listCoursesController(req, res, next);

    expect(courses.listCourses).toHaveBeenCalledWith(undefined);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("getCourseDetailController", () => {
  it("treats a visitor with no session as an anonymous viewer", async () => {
    courses.getCourseDetailForViewer.mockResolvedValue({ course_id: "course-1" } as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await getCourseDetailController(req, res, next);

    expect(courses.getCourseDetailForViewer).toHaveBeenCalledWith("course-1", TOKEN, undefined);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("marks a logged-in admin as an admin viewer", async () => {
    courses.getCourseDetailForViewer.mockResolvedValue({ course_id: "course-1" } as never);
    const req = fakeReq({
      params: { course_id: "course-1" },
      user: { user_id: "u-admin", roles: [{ role_name: "Student" }, { role_name: "Admin" }] } as never,
    });

    await getCourseDetailController(req, fakeRes(), next);

    expect(courses.getCourseDetailForViewer).toHaveBeenCalledWith("course-1", TOKEN, {
      user_id: "u-admin",
      isAdmin: true,
    });
  });

  it("marks any other logged-in user as a non-admin viewer", async () => {
    courses.getCourseDetailForViewer.mockResolvedValue({ course_id: "course-1" } as never);
    const req = fakeReq({
      params: { course_id: "course-1" },
      user: { user_id: "u-faculty", roles: [{ role_name: "Faculty" }] } as never,
    });

    await getCourseDetailController(req, fakeRes(), next);

    expect(courses.getCourseDetailForViewer).toHaveBeenCalledWith("course-1", TOKEN, {
      user_id: "u-faculty",
      isAdmin: false,
    });
  });

  it("turns a null result into a real NotFoundError", async () => {
    courses.getCourseDetailForViewer.mockResolvedValue(null as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await getCourseDetailController(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("ratings", () => {
  it("listCourseRatingsController lists ratings for the course", async () => {
    enrollment.listCourseRatings.mockResolvedValue([{ rating_id: "r-1" }] as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await listCourseRatingsController(req, res, next);

    expect(enrollment.listCourseRatings).toHaveBeenCalledWith("course-1");
  });

  it("getAverageRatingController returns the average", async () => {
    enrollment.getAverageRating.mockResolvedValue({ average: 4.5, count: 2 } as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await getAverageRatingController(req, res, next);

    expect(enrollment.getAverageRating).toHaveBeenCalledWith("course-1");
  });

  it("submitRatingController passes the course, body, and the caller's token, and responds 201", async () => {
    enrollment.submitRating.mockResolvedValue({ rating_id: "r-1" } as never);
    const req = fakeReq({ params: { course_id: "course-1" }, body: { stars: 5 } });
    const res = fakeRes();

    await submitRatingController(req, res, next);

    expect(enrollment.submitRating).toHaveBeenCalledWith("course-1", { stars: 5 }, TOKEN);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("updateRatingController passes the course, body, and the caller's token", async () => {
    enrollment.updateRating.mockResolvedValue({ rating_id: "r-1", stars: 3 } as never);
    const req = fakeReq({ params: { course_id: "course-1" }, body: { stars: 3 } });
    const res = fakeRes();

    await updateRatingController(req, res, next);

    expect(enrollment.updateRating).toHaveBeenCalledWith("course-1", { stars: 3 }, TOKEN);
  });
});

describe("markLessonCompleteController", () => {
  it("passes the course, lesson and the caller's token", async () => {
    enrollment.markLessonComplete.mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { course_id: "course-1", lesson_id: "l-1" } });
    const res = fakeRes();

    await markLessonCompleteController(req, res, next);

    expect(enrollment.markLessonComplete).toHaveBeenCalledWith("course-1", "l-1", TOKEN);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe("admin course management", () => {
  it("listCoursesForAdminController passes the caller's token", async () => {
    courses.listCoursesForAdmin.mockResolvedValue([{ course_id: "course-1" }] as never);
    const req = fakeReq();
    const res = fakeRes();

    await listCoursesForAdminController(req, res, next);

    expect(courses.listCoursesForAdmin).toHaveBeenCalledWith(TOKEN);
  });

  it("publishCourseController passes the course id and token, and responds success with no data", async () => {
    courses.publishCourse.mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await publishCourseController(req, res, next);

    expect(courses.publishCourse).toHaveBeenCalledWith("course-1", TOKEN);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("unpublishCourseController passes the course id and token", async () => {
    courses.unpublishCourse.mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await unpublishCourseController(req, res, next);

    expect(courses.unpublishCourse).toHaveBeenCalledWith("course-1", TOKEN);
  });
});

describe("faculty management", () => {
  it("listCourseFacultyController passes the course id and token", async () => {
    courses.listCourseFaculty.mockResolvedValue([{ faculty_id: "f-1" }] as never);
    const req = fakeReq({ params: { course_id: "course-1" } });
    const res = fakeRes();

    await listCourseFacultyController(req, res, next);

    expect(courses.listCourseFaculty).toHaveBeenCalledWith("course-1", TOKEN);
  });

  it("assignCourseFacultyController passes the course, faculty id from the body, and token, and responds 201 with no data", async () => {
    courses.assignCourseFaculty.mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { course_id: "course-1" }, body: { faculty_id: "f-2" } });
    const res = fakeRes();

    await assignCourseFacultyController(req, res, next);

    expect(courses.assignCourseFaculty).toHaveBeenCalledWith("course-1", "f-2", TOKEN);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("removeCourseFacultyController passes the course and faculty ids from the URL, and token", async () => {
    courses.removeCourseFaculty.mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { course_id: "course-1", faculty_id: "f-2" } });
    const res = fakeRes();

    await removeCourseFacultyController(req, res, next);

    expect(courses.removeCourseFaculty).toHaveBeenCalledWith("course-1", "f-2", TOKEN);
  });
});

describe("listMyCoursesController", () => {
  it("passes the caller's token", async () => {
    courses.listMyCourses.mockResolvedValue([{ course_id: "course-1" }] as never);
    const req = fakeReq();
    const res = fakeRes();

    await listMyCoursesController(req, res, next);

    expect(courses.listMyCourses).toHaveBeenCalledWith(TOKEN);
  });
});

describe("createCourseController", () => {
  it("passes the body and the caller's token, and responds 201", async () => {
    courses.createCourse.mockResolvedValue({ course_id: "course-1" } as never);
    const req = fakeReq({ body: { title: "New Course" } });
    const res = fakeRes();

    await createCourseController(req, res, next);

    expect(courses.createCourse).toHaveBeenCalledWith({ title: "New Course" }, TOKEN);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("module management", () => {
  it("createModuleController passes the course id, body, and token, and responds 201", async () => {
    courses.createModule.mockResolvedValue({ module_id: "mod-1" } as never);
    const req = fakeReq({ params: { course_id: "course-1" }, body: { title: "Module 1" } });
    const res = fakeRes();

    await createModuleController(req, res, next);

    expect(courses.createModule).toHaveBeenCalledWith("course-1", { title: "Module 1" }, TOKEN);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("updateModuleController passes the course, module id, body, and token", async () => {
    courses.updateModule.mockResolvedValue({ module_id: "mod-1", title: "Renamed" } as never);
    const req = fakeReq({
      params: { course_id: "course-1", module_id: "mod-1" },
      body: { title: "Renamed" },
    });
    const res = fakeRes();

    await updateModuleController(req, res, next);

    expect(courses.updateModule).toHaveBeenCalledWith("course-1", "mod-1", { title: "Renamed" }, TOKEN);
  });

  it("deleteModuleController passes the course, module id, and token, and responds success with no data", async () => {
    courses.deleteModule.mockResolvedValue(undefined as never);
    const req = fakeReq({ params: { course_id: "course-1", module_id: "mod-1" } });
    const res = fakeRes();

    await deleteModuleController(req, res, next);

    expect(courses.deleteModule).toHaveBeenCalledWith("course-1", "mod-1", TOKEN);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe("lesson management", () => {
  it("createLessonController passes the course, module, body, and token, and responds 201", async () => {
    courses.createLesson.mockResolvedValue({ lesson_id: "l-1" } as never);
    const req = fakeReq({
      params: { course_id: "course-1", module_id: "mod-1" },
      body: { title: "Lesson 1", content_type: "VIDEO" },
    });
    const res = fakeRes();

    await createLessonController(req, res, next);

    expect(courses.createLesson).toHaveBeenCalledWith(
      "course-1",
      "mod-1",
      { title: "Lesson 1", content_type: "VIDEO" },
      TOKEN
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("updateLessonController passes the course, module, lesson, body, and token", async () => {
    courses.updateLesson.mockResolvedValue({ lesson_id: "l-1", title: "Renamed" } as never);
    const req = fakeReq({
      params: { course_id: "course-1", module_id: "mod-1", lesson_id: "l-1" },
      body: { title: "Renamed" },
    });
    const res = fakeRes();

    await updateLessonController(req, res, next);

    expect(courses.updateLesson).toHaveBeenCalledWith(
      "course-1",
      "mod-1",
      "l-1",
      { title: "Renamed" },
      TOKEN
    );
  });

  it("deleteLessonController passes the course, module, lesson, and token", async () => {
    courses.deleteLesson.mockResolvedValue(undefined as never);
    const req = fakeReq({
      params: { course_id: "course-1", module_id: "mod-1", lesson_id: "l-1" },
    });
    const res = fakeRes();

    await deleteLessonController(req, res, next);

    expect(courses.deleteLesson).toHaveBeenCalledWith("course-1", "mod-1", "l-1", TOKEN);
  });
});

describe("updateCourseController", () => {
  it("passes the course id, body, and token", async () => {
    courses.updateCourseDetails.mockResolvedValue({ course_id: "course-1", title: "Renamed" } as never);
    const req = fakeReq({ params: { course_id: "course-1" }, body: { title: "Renamed" } });
    const res = fakeRes();

    await updateCourseController(req, res, next);

    expect(courses.updateCourseDetails).toHaveBeenCalledWith("course-1", { title: "Renamed" }, TOKEN);
  });
});

describe("video and resource management", () => {
  it("setLessonVideoController destructures course/module/lesson ids and the video_url", async () => {
    courses.setLessonVideo.mockResolvedValue({ lesson_id: "l-1" } as never);
    const req = fakeReq({
      params: { course_id: "course-1", module_id: "mod-1", lesson_id: "l-1" },
      body: { video_url: "/videos/a.mp4" },
    });
    const res = fakeRes();

    await setLessonVideoController(req, res, next);

    expect(courses.setLessonVideo).toHaveBeenCalledWith(
      "course-1",
      "mod-1",
      "l-1",
      "/videos/a.mp4",
      TOKEN
    );
  });

  it("removeLessonVideoController destructures the three ids", async () => {
    courses.removeLessonVideo.mockResolvedValue({ lesson_id: "l-1" } as never);
    const req = fakeReq({
      params: { course_id: "course-1", module_id: "mod-1", lesson_id: "l-1" },
    });
    const res = fakeRes();

    await removeLessonVideoController(req, res, next);

    expect(courses.removeLessonVideo).toHaveBeenCalledWith("course-1", "mod-1", "l-1", TOKEN);
  });

    it("addLessonResourceController forwards title, resource_type and file_url as one object, and responds 201", async () => {
    courses.addLessonResource.mockResolvedValue({ lesson_id: "l-1" } as never);
    const req = fakeReq({
      params: { course_id: "course-1", module_id: "mod-1", lesson_id: "l-1" },
      body: { title: "Slides", resource_type: "SLIDE", file_url: "https://cdn.example.com/a.pdf" },
    });
    const res = fakeRes();

    await addLessonResourceController(req, res, next);

    expect(courses.addLessonResource).toHaveBeenCalledWith(
      "course-1",
      "mod-1",
      "l-1",
      { title: "Slides", resource_type: "SLIDE", file_url: "https://cdn.example.com/a.pdf" },
      TOKEN
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("addLessonResourceController forwards only the three known fields from the body", async () => {
    courses.addLessonResource.mockResolvedValue({ lesson_id: "l-1" } as never);
    const req = fakeReq({
      params: { course_id: "course-1", module_id: "mod-1", lesson_id: "l-1" },
      body: { title: "Notes", file_url: "https://cdn.example.com/n.pdf", lesson_id: "someone-elses", is_admin: true },
    });

    await addLessonResourceController(req, fakeRes(), next);

    expect(courses.addLessonResource).toHaveBeenCalledWith(
      "course-1",
      "mod-1",
      "l-1",
      { title: "Notes", resource_type: undefined, file_url: "https://cdn.example.com/n.pdf" },
      TOKEN
    );
  });
});