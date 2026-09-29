import { describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "@rv-lms/shared-utils";
import { FacultyRole } from "../../generated/prisma/enums";
import { courseService } from "../course.service";
import { courseRepository } from "../../repositories/course.repository";
import { courseFacultyRepository } from "../../repositories/course-faculty.repository";

vi.mock("../../repositories/course.repository", () => ({
  courseRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findWithDetails: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    softDelete: vi.fn(),
    findByIds: vi.fn(),
  },
}));

vi.mock("../../repositories/course-faculty.repository", () => ({
  courseFacultyRepository: {
    assign: vi.fn(),
    findByCourse: vi.fn(),
    findByFaculty: vi.fn(),
    remove: vi.fn(),
    isFaculty: vi.fn(),
  },
}));

const createRow = vi.mocked(courseRepository.create);
const findById = vi.mocked(courseRepository.findById);
const findWithDetails = vi.mocked(courseRepository.findWithDetails);
const findAll = vi.mocked(courseRepository.findAll);
const updateRow = vi.mocked(courseRepository.update);
const findByIds = vi.mocked(courseRepository.findByIds);
const assign = vi.mocked(courseFacultyRepository.assign);
const findByCourse = vi.mocked(courseFacultyRepository.findByCourse);
const findByFaculty = vi.mocked(courseFacultyRepository.findByFaculty);
const removeFaculty = vi.mocked(courseFacultyRepository.remove);
const isFacultyAssigned = vi.mocked(courseFacultyRepository.isFaculty);

// The tenant the service falls back to when none is given.
const DEFAULT_TENANT = "rv-skills-tenant";
const NOW = new Date("2026-01-01T00:00:00.000Z");

/** A course as the database returns it, including a field the API must not expose. */
function aCourse(overrides: Record<string, unknown> = {}) {
  return {
    course_id: "course-1",
    tenant_id: "tenant-1",
    title: "Advanced System Design",
    description: "About the course",
    thumbnail_url: null,
    language: "en",
    difficulty: "beginner",
    status: "PUBLISHED",
    is_published: true,
    published_at: NOW,
    max_seats: null,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    ...overrides,
  } as never;
}

describe("courseService.createCourse", () => {
  const input = { tenant_id: "tenant-1", title: "New course" } as never;

  it("makes the creator the course's primary faculty, in the course's tenant", async () => {
    createRow.mockResolvedValue(aCourse());
    assign.mockResolvedValue({} as never);

    await courseService.createCourse(input, "faculty-1");

    expect(createRow).toHaveBeenCalledWith(input);
    expect(assign).toHaveBeenCalledWith(
      "course-1",
      "faculty-1",
      "tenant-1",
      FacultyRole.primary
    );
  });

  it("creates the course before assigning the creator to it", async () => {
    createRow.mockResolvedValue(aCourse());
    assign.mockResolvedValue({} as never);

    await courseService.createCourse(input, "faculty-1");

    expect(createRow.mock.invocationCallOrder[0]).toBeLessThan(
      assign.mock.invocationCallOrder[0]
    );
  });

  it("returns the new course as a DTO", async () => {
    createRow.mockResolvedValue(aCourse());
    assign.mockResolvedValue({} as never);

    const result = await courseService.createCourse(input, "faculty-1");

    expect(result).toMatchObject({
      course_id: "course-1",
      title: "Advanced System Design",
      total_lessons: 0,
    });
  });

  // Known gap: the course and the faculty assignment are two separate writes,
  // not one transaction. If the second fails, the course exists with nobody
  // teaching it, so it never appears in anyone's "My Courses". Kept as a todo
  // rather than a test that would lock that in.
  it.todo(
    "does not leave a course without faculty if assigning the creator fails"
  );
});

describe("courseService.getCourse", () => {
  it("throws NotFoundError when the course does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(courseService.getCourse("course-1")).rejects.toThrow(
      NotFoundError
    );
  });

  it("looks in the default tenant when none is given", async () => {
    findById.mockResolvedValue(aCourse());

    await courseService.getCourse("course-1");

    expect(findById).toHaveBeenCalledWith("course-1", DEFAULT_TENANT);
  });

  it("looks in the tenant it is given", async () => {
    findById.mockResolvedValue(aCourse());

    await courseService.getCourse("course-1", "tenant-9");

    expect(findById).toHaveBeenCalledWith("course-1", "tenant-9");
  });

  it("returns the course's details as a DTO, without internal fields", async () => {
    findById.mockResolvedValue(aCourse());

    const result = await courseService.getCourse("course-1");

    expect(result).toEqual({
      course_id: "course-1",
      tenant_id: "tenant-1",
      title: "Advanced System Design",
      description: "About the course",
      thumbnail_url: null,
      language: "en",
      difficulty: "beginner",
      status: "PUBLISHED",
      is_published: true,
      published_at: NOW,
      max_seats: null,
      created_at: NOW,
      updated_at: NOW,
      total_lessons: 0,
      total_duration_mins: null,
    });
    expect(result).not.toHaveProperty("deleted_at");
  });
});

describe("courseService.getCourseWithDetails", () => {
  it("throws NotFoundError when the course does not exist", async () => {
    findWithDetails.mockResolvedValue(null as never);

    await expect(
      courseService.getCourseWithDetails("course-1")
    ).rejects.toThrow(NotFoundError);
  });

  it("reads the course together with its details, in the default tenant", async () => {
    findWithDetails.mockResolvedValue(aCourse());

    await courseService.getCourseWithDetails("course-1");

    expect(findWithDetails).toHaveBeenCalledWith("course-1", DEFAULT_TENANT);
    expect(findById).not.toHaveBeenCalled();
  });

  it("passes the faculty and modules through", async () => {
    findWithDetails.mockResolvedValue(
      aCourse({
        faculty: [{ faculty_id: "f-1" }],
        modules: [{ module_id: "m-1", lessons: [] }],
      })
    );

    const result = await courseService.getCourseWithDetails("course-1");

    expect(result.faculty).toEqual([{ faculty_id: "f-1" }]);
    expect(result.modules).toEqual([{ module_id: "m-1", lessons: [] }]);
  });
});

describe("course lesson and duration totals", () => {
  it("counts lessons across every module and adds up the known durations", async () => {
    // The lesson with no duration adds nothing to the total, so a course with
    // some unknown durations shows a total that undercounts.
    findById.mockResolvedValue(
      aCourse({
        modules: [
          {
            lessons: [
              { estimated_duration_mins: 10 },
              { estimated_duration_mins: null },
            ],
          },
          { lessons: [{ estimated_duration_mins: 5 }] },
        ],
      })
    );

    const result = await courseService.getCourse("course-1");

    expect(result.total_lessons).toBe(3);
    expect(result.total_duration_mins).toBe(15);
  });

  it("gives no total duration when no lesson has one", async () => {
    findById.mockResolvedValue(
      aCourse({
        modules: [
          {
            lessons: [
              { estimated_duration_mins: null },
              { estimated_duration_mins: null },
            ],
          },
        ],
      })
    );

    const result = await courseService.getCourse("course-1");

    expect(result.total_lessons).toBe(2);
    expect(result.total_duration_mins).toBeNull();
  });

  it("treats a course with no modules as having no lessons, and leaves faculty and modules out", async () => {
    findById.mockResolvedValue(aCourse());

    const result = await courseService.getCourse("course-1");

    expect(result.total_lessons).toBe(0);
    expect(result.total_duration_mins).toBeNull();
    expect(result.modules).toBeUndefined();
    expect(result.faculty).toBeUndefined();
  });

  it("treats a module with no lessons list as having none", async () => {
    findById.mockResolvedValue(aCourse({ modules: [{}] }));

    const result = await courseService.getCourse("course-1");

    expect(result.total_lessons).toBe(0);
  });
});

describe("courseService.listCourses", () => {
  it("lists a tenant's courses, passing the filters through", async () => {
    findAll.mockResolvedValue([] as never);

    await courseService.listCourses("tenant-1", { is_published: true });

    expect(findAll).toHaveBeenCalledWith("tenant-1", { is_published: true });
  });

  it("uses the default tenant when none is given", async () => {
    findAll.mockResolvedValue([] as never);

    await courseService.listCourses();

    expect(findAll).toHaveBeenCalledWith(DEFAULT_TENANT, undefined);
  });

  it("returns each course as a DTO, with its totals", async () => {
    findAll.mockResolvedValue([
      aCourse({ modules: [{ lessons: [{ estimated_duration_mins: 4 }] }] }),
      aCourse({ course_id: "course-2" }),
    ] as never);

    const result = await courseService.listCourses();

    expect(result.map((c) => c.course_id)).toEqual(["course-1", "course-2"]);
    expect(result[0].total_lessons).toBe(1);
    expect(result[1].total_lessons).toBe(0);
  });
});

describe("courseService.updateCourse", () => {
  it("throws NotFoundError, and updates nothing, when the course does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(
      courseService.updateCourse("course-1", "tenant-1", { title: "Renamed" })
    ).rejects.toThrow(NotFoundError);
    expect(updateRow).not.toHaveBeenCalled();
  });

  it("updates the course in its tenant, then returns it as it is after the update", async () => {
    findById
      .mockResolvedValueOnce(aCourse())
      .mockResolvedValueOnce(aCourse({ title: "Renamed" }));
    updateRow.mockResolvedValue({} as never);

    const result = await courseService.updateCourse("course-1", "tenant-1", {
      title: "Renamed",
    });

    expect(updateRow).toHaveBeenCalledWith("course-1", "tenant-1", {
      title: "Renamed",
    });
    expect(findById).toHaveBeenNthCalledWith(2, "course-1", "tenant-1");
    expect(result.title).toBe("Renamed");
  });
});

// Publishing, unpublishing and deleting follow exactly the same rule: the
// course must exist in the tenant, and then the change is applied.
const operations = [
  { name: "publishCourse", change: vi.mocked(courseRepository.publish) },
  { name: "unpublishCourse", change: vi.mocked(courseRepository.unpublish) },
  { name: "deleteCourse", change: vi.mocked(courseRepository.softDelete) },
] as const;

describe.each(operations)("courseService.$name", ({ name, change }) => {
  it("throws NotFoundError, and changes nothing, when the course does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(courseService[name]("course-1")).rejects.toThrow(NotFoundError);
    expect(change).not.toHaveBeenCalled();
  });

  it("changes an existing course in the default tenant", async () => {
    findById.mockResolvedValue(aCourse());

    await courseService[name]("course-1");

    expect(findById).toHaveBeenCalledWith("course-1", DEFAULT_TENANT);
    expect(change).toHaveBeenCalledWith("course-1", DEFAULT_TENANT);
  });

  it("uses the tenant it is given", async () => {
    findById.mockResolvedValue(aCourse());

    await courseService[name]("course-1", "tenant-9");

    expect(findById).toHaveBeenCalledWith("course-1", "tenant-9");
    expect(change).toHaveBeenCalledWith("course-1", "tenant-9");
  });
});

describe("courseService faculty", () => {
  it("lists a course's faculty", async () => {
    findByCourse.mockResolvedValue([{ faculty_id: "f-1" }] as never);

    await expect(courseService.listFaculty("course-1")).resolves.toEqual([
      { faculty_id: "f-1" },
    ]);
    expect(findByCourse).toHaveBeenCalledWith("course-1");
  });

  it("throws NotFoundError when assigning faculty to a course that does not exist", async () => {
    findById.mockResolvedValue(null as never);

    await expect(
      courseService.assignFaculty("course-1", "f-1", "tenant-1")
    ).rejects.toThrow(NotFoundError);
    expect(isFacultyAssigned).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("throws ConflictError when the faculty member is already assigned", async () => {
    findById.mockResolvedValue(aCourse());
    isFacultyAssigned.mockResolvedValue(true as never);

    await expect(
      courseService.assignFaculty("course-1", "f-1", "tenant-1")
    ).rejects.toThrow(ConflictError);
    expect(assign).not.toHaveBeenCalled();
  });

  it("checks the course in the tenant given, before checking assignment", async () => {
    findById.mockResolvedValue(aCourse());
    isFacultyAssigned.mockResolvedValue(false as never);
    assign.mockResolvedValue({} as never);

    await courseService.assignFaculty("course-1", "f-1", "tenant-9");

    expect(findById).toHaveBeenCalledWith("course-1", "tenant-9");
    expect(isFacultyAssigned).toHaveBeenCalledWith("course-1", "f-1");
  });

  it("assigns faculty as primary when no role is given", async () => {
    findById.mockResolvedValue(aCourse());
    isFacultyAssigned.mockResolvedValue(false as never);
    assign.mockResolvedValue({} as never);

    await courseService.assignFaculty("course-1", "f-1", "tenant-1");

    expect(assign).toHaveBeenCalledWith(
      "course-1",
      "f-1",
      "tenant-1",
      FacultyRole.primary
    );
  });

  it("keeps an explicit role", async () => {
    findById.mockResolvedValue(aCourse());
    isFacultyAssigned.mockResolvedValue(false as never);
    assign.mockResolvedValue({} as never);

    await courseService.assignFaculty("course-1", "f-1", "tenant-1", FacultyRole.ta);

    expect(assign).toHaveBeenCalledWith(
      "course-1",
      "f-1",
      "tenant-1",
      FacultyRole.ta
    );
  });

  it("removes a faculty member from a course", async () => {
    removeFaculty.mockResolvedValue({ faculty_id: "f-1" } as never);

    await expect(
      courseService.removeFaculty("course-1", "f-1")
    ).resolves.toEqual({ faculty_id: "f-1" });
    expect(removeFaculty).toHaveBeenCalledWith("course-1", "f-1");
  });
});

describe("courseService.listMyCourses", () => {
  it("returns an empty list, without querying courses, for a faculty member who teaches none", async () => {
    findByFaculty.mockResolvedValue([] as never);

    await expect(
      courseService.listMyCourses("f-1", "tenant-1")
    ).resolves.toEqual([]);
    expect(findByIds).not.toHaveBeenCalled();
  });

  it("finds the courses a faculty member is assigned to, within the tenant", async () => {
    findByFaculty.mockResolvedValue([
      { course_id: "c-1" },
      { course_id: "c-2" },
    ] as never);
    findByIds.mockResolvedValue([] as never);

    await courseService.listMyCourses("f-1", "tenant-1");

    expect(findByFaculty).toHaveBeenCalledWith("f-1", "tenant-1");
    expect(findByIds).toHaveBeenCalledWith(["c-1", "c-2"], "tenant-1");
  });

  it("returns the courses as the repository gives them", async () => {
    // Unlike the other course reads, these are not mapped to DTOs.
    const courses = [{ course_id: "c-1", title: "Advanced System Design" }];
    findByFaculty.mockResolvedValue([{ course_id: "c-1" }] as never);
    findByIds.mockResolvedValue(courses as never);

    await expect(
      courseService.listMyCourses("f-1", "tenant-1")
    ).resolves.toEqual(courses);
  });
});