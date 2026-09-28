import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@rv-lms/shared-utils";
import { EnrollmentStatus } from "../../generated/prisma/enums";
import { enrollmentService } from "../enrollment.service";
import { prisma } from "../../db/prisma";
import { enrollmentRepository } from "../../repositories/enrollment.repository";
import { lessonProgressRepository } from "../../repositories/lesson-progress.repository";
import { courseServiceClient } from "../../clients/course-service.client";
import { lessonProgressService } from "../lesson-progress.service";

vi.mock("../../db/prisma", () => ({ prisma: { $transaction: vi.fn() } }));

vi.mock("../../repositories/enrollment.repository", () => ({
  enrollmentRepository: {
    findByStudentAndCourse: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    findById: vi.fn(),
    markDropped: vi.fn(),
    findByStudent: vi.fn(),
    countAll: vi.fn(),
    countByCourseAll: vi.fn(),
  },
}));

vi.mock("../../repositories/lesson-progress.repository", () => ({
  lessonProgressRepository: { getCompletedLessonIds: vi.fn() },
}));

vi.mock("../../clients/course-service.client", () => ({
  courseServiceClient: { getCourse: vi.fn() },
}));

vi.mock("../lesson-progress.service", () => ({
  lessonProgressService: { getProgress: vi.fn() },
}));

const OWNER = "student-1";
const STRANGER = "student-2";

const getCourse = vi.mocked(courseServiceClient.getCourse);
const findExisting = vi.mocked(enrollmentRepository.findByStudentAndCourse);
const countEnrolled = vi.mocked(enrollmentRepository.count);
const createEnrollment = vi.mocked(enrollmentRepository.create);
const findEnrollment = vi.mocked(enrollmentRepository.findById);

// A stand-in for the transaction client Prisma hands to a $transaction callback.
const tx = { $executeRaw: vi.fn() };

beforeEach(() => {
  // Run the transaction callback straight away, with our fake client.
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (callback: (client: typeof tx) => unknown) => callback(tx)) as never
  );
});

function aCourse(overrides: Record<string, unknown> = {}) {
  return { is_published: true, max_seats: null, ...overrides } as never;
}

function anEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    enrollment_id: "enr-1",
    student_id: OWNER,
    course_id: "course-1",
    status: EnrollmentStatus.ACTIVE,
    ...overrides,
  } as never;
}

describe("enrollmentService.enrollCourse", () => {
  it("rejects a course that is not published", async () => {
    getCourse.mockResolvedValue(aCourse({ is_published: false }));

    await expect(
      enrollmentService.enrollCourse(OWNER, "course-1", "tenant-1")
    ).rejects.toThrow(ValidationError);
    expect(findExisting).not.toHaveBeenCalled();
  });

  it("rejects a student who is already enrolled, without opening a transaction", async () => {
    getCourse.mockResolvedValue(aCourse());
    findExisting.mockResolvedValue({ enrollment_id: "enr-1" } as never);

    await expect(
      enrollmentService.enrollCourse(OWNER, "course-1", "tenant-1")
    ).rejects.toThrow(ConflictError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("enrolls without a seat check when the course has no limit", async () => {
    getCourse.mockResolvedValue(aCourse({ max_seats: null }));
    findExisting.mockResolvedValue(null as never);
    createEnrollment.mockResolvedValue({ enrollment_id: "enr-1" } as never);

    const result = await enrollmentService.enrollCourse(
      OWNER,
      "course-1",
      "tenant-1"
    );

    expect(countEnrolled).not.toHaveBeenCalled();
    expect(createEnrollment).toHaveBeenCalledWith(
      { student_id: OWNER, course_id: "course-1", tenant_id: "tenant-1" },
      tx
    );
    expect(result).toEqual({ enrollment_id: "enr-1" });
  });

  it("takes an advisory lock inside the transaction", async () => {
    // A mock can only show the lock is requested. Whether it really stops two
    // students taking the last seat needs a real database (integration tests).
    getCourse.mockResolvedValue(aCourse({ max_seats: 10 }));
    findExisting.mockResolvedValue(null as never);
    countEnrolled.mockResolvedValue(0 as never);
    createEnrollment.mockResolvedValue({ enrollment_id: "enr-1" } as never);

    await enrollmentService.enrollCourse(OWNER, "course-1", "tenant-1");

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("enrolls while seats remain, counting inside the transaction", async () => {
    getCourse.mockResolvedValue(aCourse({ max_seats: 10 }));
    findExisting.mockResolvedValue(null as never);
    countEnrolled.mockResolvedValue(9 as never);
    createEnrollment.mockResolvedValue({ enrollment_id: "enr-1" } as never);

    await enrollmentService.enrollCourse(OWNER, "course-1", "tenant-1");

    expect(countEnrolled).toHaveBeenCalledWith("course-1", tx);
    expect(createEnrollment).toHaveBeenCalledTimes(1);
  });

  it.each([
    [5, 5],
    [6, 5],
  ])(
    "rejects a full course with %i enrolled and a limit of %i",
    async (enrolled, limit) => {
      getCourse.mockResolvedValue(aCourse({ max_seats: limit }));
      findExisting.mockResolvedValue(null as never);
      countEnrolled.mockResolvedValue(enrolled as never);

      await expect(
        enrollmentService.enrollCourse(OWNER, "course-1", "tenant-1")
      ).rejects.toThrow(ConflictError);
      expect(createEnrollment).not.toHaveBeenCalled();
    }
  );
});

describe("enrollmentService.bulkEnrollCourse", () => {
  const students = [
    { student_id: "s-1", tenant_id: "tenant-1" },
    { student_id: "s-2", tenant_id: "tenant-1" },
    { student_id: "s-3", tenant_id: "tenant-1" },
  ];

  it("rejects a course that is not published", async () => {
    getCourse.mockResolvedValue(aCourse({ is_published: false }));

    await expect(
      enrollmentService.bulkEnrollCourse(students, "course-1")
    ).rejects.toThrow(ValidationError);
    expect(enrollmentRepository.createMany).not.toHaveBeenCalled();
  });

  it("reports how many were requested, enrolled and skipped", async () => {
    getCourse.mockResolvedValue(aCourse());
    vi.mocked(enrollmentRepository.createMany).mockResolvedValue({
      count: 2,
    } as never);

    const result = await enrollmentService.bulkEnrollCourse(
      students,
      "course-1"
    );

    expect(enrollmentRepository.createMany).toHaveBeenCalledWith([
      { student_id: "s-1", course_id: "course-1", tenant_id: "tenant-1" },
      { student_id: "s-2", course_id: "course-1", tenant_id: "tenant-1" },
      { student_id: "s-3", course_id: "course-1", tenant_id: "tenant-1" },
    ]);
    expect(result).toEqual({ requested: 3, enrolled: 2, skipped: 1 });
  });
});

describe("enrollmentService.dropCourse", () => {
  it("throws NotFoundError when the enrollment does not exist", async () => {
    findEnrollment.mockResolvedValue(null as never);

    await expect(
      enrollmentService.dropCourse("enr-1", OWNER)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when the enrollment belongs to someone else", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());

    await expect(
      enrollmentService.dropCourse("enr-1", STRANGER)
    ).rejects.toThrow(ForbiddenError);
    expect(enrollmentRepository.markDropped).not.toHaveBeenCalled();
  });

  it("checks ownership before status, so a stranger always gets ForbiddenError", async () => {
    findEnrollment.mockResolvedValue(
      anEnrollment({ status: EnrollmentStatus.COMPLETED })
    );

    await expect(
      enrollmentService.dropCourse("enr-1", STRANGER)
    ).rejects.toThrow(ForbiddenError);
  });

  it.each([EnrollmentStatus.COMPLETED, EnrollmentStatus.DROPPED])(
    "throws ValidationError when the enrollment is already %s",
    async (status) => {
      findEnrollment.mockResolvedValue(anEnrollment({ status }));

      await expect(
        enrollmentService.dropCourse("enr-1", OWNER)
      ).rejects.toThrow(ValidationError);
      expect(enrollmentRepository.markDropped).not.toHaveBeenCalled();
    }
  );

  it("drops an active enrollment", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());
    vi.mocked(enrollmentRepository.markDropped).mockResolvedValue({
      status: EnrollmentStatus.DROPPED,
    } as never);

    const result = await enrollmentService.dropCourse("enr-1", OWNER);

    expect(enrollmentRepository.markDropped).toHaveBeenCalledWith("enr-1");
    expect(result).toEqual({ status: EnrollmentStatus.DROPPED });
  });
});

describe("enrollmentService.getEnrollment", () => {
  const asOwner = { user_id: OWNER, isAdmin: false };
  const asStranger = { user_id: STRANGER, isAdmin: false };
  const asAdmin = { user_id: "admin-1", isAdmin: true };

  it("throws NotFoundError when the enrollment does not exist", async () => {
    findEnrollment.mockResolvedValue(null as never);

    await expect(
      enrollmentService.getEnrollment("enr-1", asOwner)
    ).rejects.toThrow(NotFoundError);
  });

  it("returns the enrollment to the student it belongs to", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());

    await expect(
      enrollmentService.getEnrollment("enr-1", asOwner)
    ).resolves.toEqual(anEnrollment());
  });

  it("refuses a different student", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());

    await expect(
      enrollmentService.getEnrollment("enr-1", asStranger)
    ).rejects.toThrow(ForbiddenError);
  });

  it("lets an administrator read any student's enrollment", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());

    await expect(
      enrollmentService.getEnrollment("enr-1", asAdmin)
    ).resolves.toEqual(anEnrollment());
  });
});

// Known gaps in bulk enrollment. Kept as todos rather than tests that would
// lock the current behaviour in.
describe("enrollmentService.bulkEnrollCourse: known gaps", () => {
  it.todo("stops enrolling once the course is full");
  it.todo("skips student ids that do not belong to real users");
});

describe("enrollmentService.getStudentEnrollments", () => {
  it("adds progress to each enrollment", async () => {
    vi.mocked(enrollmentRepository.findByStudent).mockResolvedValue([
      { enrollment_id: "enr-1", course_id: "course-1" },
      { enrollment_id: "enr-2", course_id: "course-2" },
    ] as never);
    vi.mocked(lessonProgressService.getProgress).mockImplementation(
      async (enrollmentId: string) =>
        enrollmentId === "enr-1"
          ? { completedCount: 1, totalLessons: 4 }
          : { completedCount: 0, totalLessons: 2 }
    );

    const result = await enrollmentService.getStudentEnrollments(
      OWNER,
      "tenant-1"
    );

    expect(result).toEqual([
      {
        enrollment_id: "enr-1",
        course_id: "course-1",
        completedCount: 1,
        totalLessons: 4,
      },
      {
        enrollment_id: "enr-2",
        course_id: "course-2",
        completedCount: 0,
        totalLessons: 2,
      },
    ]);
    expect(lessonProgressService.getProgress).toHaveBeenCalledWith(
      "enr-2",
      "course-2"
    );
  });

  it("returns an empty list for a student with no enrollments", async () => {
    vi.mocked(enrollmentRepository.findByStudent).mockResolvedValue([] as never);

    await expect(
      enrollmentService.getStudentEnrollments(OWNER, "tenant-1")
    ).resolves.toEqual([]);
  });
});

describe("enrollmentService.getCompletedLessonIds", () => {
  it("throws NotFoundError when the enrollment does not exist", async () => {
    findEnrollment.mockResolvedValue(null as never);

    await expect(
      enrollmentService.getCompletedLessonIds("enr-1", OWNER)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when the enrollment belongs to someone else", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());

    await expect(
      enrollmentService.getCompletedLessonIds("enr-1", STRANGER)
    ).rejects.toThrow(ForbiddenError);
    expect(lessonProgressRepository.getCompletedLessonIds).not.toHaveBeenCalled();
  });

  it("returns the completed lesson ids for the owner", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());
    vi.mocked(lessonProgressRepository.getCompletedLessonIds).mockResolvedValue([
      "lesson-1",
      "lesson-2",
    ] as never);

    await expect(
      enrollmentService.getCompletedLessonIds("enr-1", OWNER)
    ).resolves.toEqual(["lesson-1", "lesson-2"]);
  });
});

describe("enrollmentService counts", () => {
  it("counts every enrollment in a tenant", async () => {
    vi.mocked(enrollmentRepository.countAll).mockResolvedValue(10 as never);

    await expect(
      enrollmentService.countAllEnrollments("tenant-1")
    ).resolves.toBe(10);
    expect(enrollmentRepository.countAll).toHaveBeenCalledWith("tenant-1");
  });

  it("flattens the per-course grouping into course_id and count", async () => {
    vi.mocked(enrollmentRepository.countByCourseAll).mockResolvedValue([
      { course_id: "course-1", _count: { course_id: 2 } },
      { course_id: "course-2", _count: { course_id: 8 } },
    ] as never);

    await expect(
      enrollmentService.countEnrollmentsByCourse("tenant-1")
    ).resolves.toEqual([
      { course_id: "course-1", count: 2 },
      { course_id: "course-2", count: 8 },
    ]);
  });
});