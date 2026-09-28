import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@rv-lms/shared-utils";
import { requireCourseReadable } from "../course-access.middleware";
import { courseRepository } from "../../repositories/course.repository";
import { moduleRepository } from "../../repositories/module.repository";
import { lessonRepository } from "../../repositories/lesson.repository";
import { courseFacultyRepository } from "../../repositories/course-faculty.repository";

// The repositories are replaced with empty mocks, so these tests exercise only
// the access rules: no database, no network.
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
const STUDENT = {
  ...FACULTY,
  user_id: "s-1",
  roles: ["Student"],
  permissions: ["course:read"],
};

const COURSE_ONLY = { course_id: "course-1" };
const WITH_MODULE = { course_id: "course-1", module_id: "mod-1" };
const WITH_LESSON = { ...WITH_MODULE, lesson_id: "lesson-1" };

type User = typeof FACULTY | undefined;

function request(user: User, params: Record<string, string> = COURSE_ONLY) {
  return { user, params } as never;
}

const runReader = (user: User, params?: Record<string, string>) =>
  requireCourseReadable(request(user, params), {} as never, next as never);

/** Sets up what the repositories return. Pass course: null to make it missing. */
function arrange(
  options: {
    course?: object | null;
    published?: boolean;
    assigned?: boolean;
    module?: { course_id: string } | null;
    lesson?: { module_id: string } | null;
  } = {}
) {
  const {
    published = true,
    assigned = false,
    module = { course_id: "course-1" },
    lesson = { module_id: "mod-1" },
  } = options;
  const course =
    options.course === undefined
      ? { course_id: "course-1", is_published: published }
      : options.course;
  findCourse.mockResolvedValue(course as never);
  isFaculty.mockResolvedValue(assigned as never);
  findModule.mockResolvedValue(module as never);
  findLesson.mockResolvedValue(lesson as never);
}

describe("requireCourseReadable: published courses", () => {
  it("lets a visitor who is not logged in through, without asking about assignment", async () => {
    arrange();

    await runReader(undefined);

    expect(next).toHaveBeenCalledTimes(1);
    expect(isFaculty).not.toHaveBeenCalled();
  });

  it("lets any logged-in user through, without asking about assignment", async () => {
    arrange();

    await runReader(STUDENT);

    expect(next).toHaveBeenCalledTimes(1);
    expect(isFaculty).not.toHaveBeenCalled();
  });

  it("looks the course up in the default tenant for a visitor", async () => {
    arrange();

    await runReader(undefined);

    expect(findCourse).toHaveBeenCalledWith("course-1", "rv-skills-tenant");
  });

  it("looks the course up in the user's own tenant when logged in", async () => {
    arrange();

    await runReader({ ...STUDENT, tenant_id: "tenant-9" });

    expect(findCourse).toHaveBeenCalledWith("course-1", "tenant-9");
  });

  it.each([
    { label: "a visitor", user: undefined },
    { label: "an administrator", user: ADMIN },
  ])(
    "throws NotFoundError for a course that does not exist ($label)",
    async ({ user }) => {
      arrange({ course: null });

      await expect(runReader(user)).rejects.toThrow(NotFoundError);
      expect(next).not.toHaveBeenCalled();
    }
  );
});

describe("requireCourseReadable: draft courses", () => {
  it.each([
    { label: "a visitor who is not logged in", user: undefined },
    { label: "a student", user: STUDENT },
    { label: "faculty who are not assigned to it", user: FACULTY },
  ])(
    "hides a draft from $label, exactly as if it did not exist",
    async ({ user }) => {
      arrange({ published: false, assigned: false });

      const result = runReader(user);

      await expect(result).rejects.toThrow(NotFoundError);
      await expect(result).rejects.toThrow("Course not found");
      expect(next).not.toHaveBeenCalled();
    }
  );

  it("asks whether a logged-in user who is not an administrator is assigned, using their id", async () => {
    arrange({ published: false, assigned: false });

    await expect(runReader(FACULTY)).rejects.toThrow(NotFoundError);

    expect(isFaculty).toHaveBeenCalledWith("course-1", "f-1");
  });

  it("does not ask a visitor whether they are assigned", async () => {
    arrange({ published: false });

    await expect(runReader(undefined)).rejects.toThrow(NotFoundError);

    expect(isFaculty).not.toHaveBeenCalled();
  });

  it("lets faculty assigned to the draft read it", async () => {
    arrange({ published: false, assigned: true });

    await runReader(FACULTY);

    expect(isFaculty).toHaveBeenCalledWith("course-1", "f-1");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("lets an administrator read any draft, without checking assignment", async () => {
    arrange({ published: false, assigned: false });

    await runReader(ADMIN);

    expect(isFaculty).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("looks up no modules for someone who may not read the draft", async () => {
    arrange({ published: false });

    await expect(runReader(undefined, WITH_MODULE)).rejects.toThrow(
      NotFoundError
    );

    expect(findModule).not.toHaveBeenCalled();
  });
});

describe("requireCourseReadable: the module and lesson in the URL", () => {
  it("lets a module of this course through", async () => {
    arrange();

    await runReader(undefined, WITH_MODULE);

    expect(findModule).toHaveBeenCalledWith("mod-1");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("throws NotFoundError when the module does not exist", async () => {
    arrange({ module: null });

    await expect(runReader(undefined, WITH_MODULE)).rejects.toThrow(
      NotFoundError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a module of a different course, even when this course is published", async () => {
    // /courses/course-1/modules/mod-1, but mod-1 really belongs to course-2,
    // which may be a draft. Anyone could read it this way before.
    arrange({ published: true, module: { course_id: "course-2" } });

    await expect(runReader(undefined, WITH_MODULE)).rejects.toThrow(
      NotFoundError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("lets a lesson of this module through", async () => {
    arrange();

    await runReader(undefined, WITH_LESSON);

    expect(findLesson).toHaveBeenCalledWith("lesson-1");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("throws NotFoundError when the lesson does not exist", async () => {
    arrange({ lesson: null });

    await expect(runReader(undefined, WITH_LESSON)).rejects.toThrow(
      NotFoundError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a lesson of a different module", async () => {
    arrange({ lesson: { module_id: "mod-2" } });

    await expect(runReader(undefined, WITH_LESSON)).rejects.toThrow(
      NotFoundError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("stops at a module of another course, without looking up the lesson", async () => {
    arrange({ module: { course_id: "course-2" } });

    await expect(runReader(undefined, WITH_LESSON)).rejects.toThrow(
      NotFoundError
    );
    expect(findLesson).not.toHaveBeenCalled();
  });

  it("does not look up modules or lessons on a course-level route", async () => {
    arrange();

    await runReader(undefined, COURSE_ONLY);

    expect(findModule).not.toHaveBeenCalled();
    expect(findLesson).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("checks the path for administrators reading a draft too", async () => {
    arrange({ published: false, module: { course_id: "course-2" } });

    await expect(runReader(ADMIN, WITH_MODULE)).rejects.toThrow(NotFoundError);
    expect(next).not.toHaveBeenCalled();
  });
});