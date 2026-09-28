import { describe, expect, it, vi } from "vitest";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@rv-lms/shared-utils";
import {
  requireAdmin,
  requireCourseEditor,
} from "../course-access.middleware";
import { courseRepository } from "../../repositories/course.repository";
import { moduleRepository } from "../../repositories/module.repository";
import { lessonRepository } from "../../repositories/lesson.repository";
import { courseFacultyRepository } from "../../repositories/course-faculty.repository";

vi.mock("../../repositories/course.repository", () => ({
  courseRepository: { findById: vi.fn() },
}));
vi.mock("../../repositories/module.repository", () => ({
  moduleRepository: { findById: vi.fn() },
}));
vi.mock("../../repositories/lesson.repository", () => ({
  lessonRepository: { findById: vi.fn() },
}));
vi.mock("../../repositories/course-faculty.repository", () => ({
  courseFacultyRepository: { isFaculty: vi.fn() },
}));

const findCourse = vi.mocked(courseRepository.findById);
const findModule = vi.mocked(moduleRepository.findById);
const findLesson = vi.mocked(lessonRepository.findById);
const isFaculty = vi.mocked(courseFacultyRepository.isFaculty);
const next = vi.fn();

const FACULTY = {
  user_id: "f-1",
  tenant_id: "tenant-1",
  roles: ["Faculty"],
  permissions: ["course:write"],
};
const ADMIN = { ...FACULTY, user_id: "a-1", roles: ["Admin"] };

const COURSE_ONLY = { course_id: "course-1" };
const WITH_MODULE = { course_id: "course-1", module_id: "mod-1" };
const WITH_LESSON = { ...WITH_MODULE, lesson_id: "lesson-1" };

type User = typeof FACULTY | undefined;

function request(user: User, params: Record<string, string> = COURSE_ONLY) {
  return { user, params } as never;
}

const runEditor = (user: User, params?: Record<string, string>) =>
  requireCourseEditor(request(user, params), {} as never, next as never);

/** Sets up what the repositories return. Pass null to make something missing. */
function arrange(
  options: {
    course?: object | null;
    assigned?: boolean;
    module?: { course_id: string } | null;
    lesson?: { module_id: string } | null;
  } = {}
) {
  const {
    course = { course_id: "course-1" },
    assigned = true,
    module = { course_id: "course-1" },
    lesson = { module_id: "mod-1" },
  } = options;
  findCourse.mockResolvedValue(course as never);
  isFaculty.mockResolvedValue(assigned as never);
  findModule.mockResolvedValue(module as never);
  findLesson.mockResolvedValue(lesson as never);
}

describe("requireAdmin", () => {
  it("lets an administrator through", () => {
    requireAdmin(request(ADMIN), {} as never, next as never);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("lets through a user who has Admin among several roles", () => {
    const user = { ...FACULTY, roles: ["Student", "Admin"] };

    requireAdmin(request(user), {} as never, next as never);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    { label: "a faculty member", user: FACULTY },
    { label: "a student", user: { ...FACULTY, roles: ["Student"] } },
    { label: "a user with no roles", user: { ...FACULTY, roles: [] } },
    { label: "a request with no user", user: undefined },
  ])("refuses $label", ({ user }) => {
    expect(() =>
      requireAdmin(request(user), {} as never, next as never)
    ).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireCourseEditor: who may edit the course", () => {
  it("rejects a request with no authenticated user, before looking anything up", async () => {
    await expect(runEditor(undefined)).rejects.toThrow(UnauthorizedError);
    expect(findCourse).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the course does not exist, before checking assignment", async () => {
    arrange({ course: null });

    await expect(runEditor(FACULTY)).rejects.toThrow(NotFoundError);
    expect(isFaculty).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("looks the course up in the user's own tenant", async () => {
    arrange();

    await runEditor({ ...FACULTY, tenant_id: "tenant-9" });

    expect(findCourse).toHaveBeenCalledWith("course-1", "tenant-9");
  });

  it("lets an administrator through without checking whether they are assigned", async () => {
    arrange({ assigned: false });

    await runEditor(ADMIN);

    expect(isFaculty).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("lets faculty assigned to the course through", async () => {
    arrange({ assigned: true });

    await runEditor(FACULTY);

    expect(isFaculty).toHaveBeenCalledWith("course-1", "f-1");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("refuses faculty who are not assigned to the course, before looking at any module", async () => {
    arrange({ assigned: false });

    await expect(runEditor(FACULTY, WITH_MODULE)).rejects.toThrow(
      ForbiddenError
    );
    expect(findModule).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("does not look up modules or lessons on a course-level route", async () => {
    arrange();

    await runEditor(FACULTY, COURSE_ONLY);

    expect(findModule).not.toHaveBeenCalled();
    expect(findLesson).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("requireCourseEditor: the module in the URL must belong to the course", () => {
  it("lets a module of this course through", async () => {
    arrange();

    await runEditor(FACULTY, WITH_MODULE);

    expect(findModule).toHaveBeenCalledWith("mod-1");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("throws NotFoundError when the module does not exist", async () => {
    arrange({ module: null });

    await expect(runEditor(FACULTY, WITH_MODULE)).rejects.toThrow(
      NotFoundError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a module that belongs to a different course", async () => {
    // /courses/course-1/modules/mod-1, but mod-1 is really in course-2. An
    // assigned faculty member must not be able to edit it this way.
    arrange({ module: { course_id: "course-2" } });

    await expect(runEditor(FACULTY, WITH_MODULE)).rejects.toThrow(
      NotFoundError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("gives an unassigned faculty member Forbidden, not NotFound, so they learn nothing about the course's modules", async () => {
    arrange({ assigned: false, module: { course_id: "course-2" } });

    await expect(runEditor(FACULTY, WITH_MODULE)).rejects.toThrow(
      ForbiddenError
    );
    expect(findModule).not.toHaveBeenCalled();
  });

  it("checks the module belongs to the course for administrators too", async () => {
    arrange({ module: { course_id: "course-2" } });

    await expect(runEditor(ADMIN, WITH_MODULE)).rejects.toThrow(NotFoundError);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireCourseEditor: the lesson in the URL must belong to the module", () => {
  it("lets a lesson of this module through", async () => {
    arrange();

    await runEditor(FACULTY, WITH_LESSON);

    expect(findLesson).toHaveBeenCalledWith("lesson-1");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("throws NotFoundError when the lesson does not exist", async () => {
    arrange({ lesson: null });

    await expect(runEditor(FACULTY, WITH_LESSON)).rejects.toThrow(
      NotFoundError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a lesson that belongs to a different module", async () => {
    arrange({ lesson: { module_id: "mod-2" } });

    await expect(runEditor(FACULTY, WITH_LESSON)).rejects.toThrow(
      NotFoundError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("stops at a module from another course, without looking up the lesson", async () => {
    // The lesson may truly belong to that module, but the module is not in this
    // course, so the whole path is wrong.
    arrange({ module: { course_id: "course-2" } });

    await expect(runEditor(FACULTY, WITH_LESSON)).rejects.toThrow(
      NotFoundError
    );
    expect(findLesson).not.toHaveBeenCalled();
  });
});