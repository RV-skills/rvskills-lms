import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@rv-lms/shared-utils";
import { EnrollmentStatus } from "../../generated/prisma/enums";
import { lessonProgressService } from "../lesson-progress.service";
import { lessonProgressRepository } from "../../repositories/lesson-progress.repository";
import { enrollmentRepository } from "../../repositories/enrollment.repository";
import { courseServiceClient } from "../../clients/course-service.client";


vi.mock("../../db/prisma", () => ({ prisma: {} }));

vi.mock("../../repositories/lesson-progress.repository", () => ({
  lessonProgressRepository: { count: vi.fn(), markComplete: vi.fn() },
}));

vi.mock("../../repositories/enrollment.repository", () => ({
  enrollmentRepository: { findById: vi.fn(), markCompleted: vi.fn() },
}));

vi.mock("../../clients/course-service.client", () => ({
  courseServiceClient: { getCourse: vi.fn() },
}));

const OWNER = "student-1";
const STRANGER = "student-2";

const getCourse = vi.mocked(courseServiceClient.getCourse);
const countCompleted = vi.mocked(lessonProgressRepository.count);
const markComplete = vi.mocked(lessonProgressRepository.markComplete);
const findEnrollment = vi.mocked(enrollmentRepository.findById);
const markEnrollmentCompleted = vi.mocked(enrollmentRepository.markCompleted);

// The service caches each course's lesson count in module-level state for five
// minutes. Every test therefore uses its own course id, so no test can see a
// count cached by another.
let courseCounter = 0;
function freshCourseId() {
  courseCounter += 1;
  return `course-${courseCounter}`;
}

/** A course whose modules hold the given number of lessons each. */
function courseWithLessons(...lessonsPerModule: number[]) {
  return {
    modules: lessonsPerModule.map((n) => ({
      lessons: Array.from({ length: n }, () => ({})),
    })),
  } as never;
}

/** Sets up an enrollment owned by OWNER in a course with `total` lessons. */
function arrange(options: {
  completed: number;
  total: number;
  status?: string;
}) {
  const courseId = freshCourseId();
  findEnrollment.mockResolvedValue({
    enrollment_id: "enr-1",
    student_id: OWNER,
    course_id: courseId,
    status: options.status ?? EnrollmentStatus.ACTIVE,
  } as never);
  getCourse.mockResolvedValue(courseWithLessons(options.total));
  countCompleted.mockResolvedValue(options.completed);
  return courseId;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("lessonProgressService.getProgress", () => {
  it("counts lessons across every module", async () => {
    getCourse.mockResolvedValue(courseWithLessons(2, 1));
    countCompleted.mockResolvedValue(1);

    await expect(
      lessonProgressService.getProgress("enr-1", freshCourseId())
    ).resolves.toEqual({ completedCount: 1, totalLessons: 3 });
  });

  it("treats a course with no modules as having no lessons", async () => {
    getCourse.mockResolvedValue({} as never);
    countCompleted.mockResolvedValue(0);

    await expect(
      lessonProgressService.getProgress("enr-1", freshCourseId())
    ).resolves.toEqual({ completedCount: 0, totalLessons: 0 });
  });

  it("caches a course's lesson count, but never a student's progress", async () => {
    const courseId = freshCourseId();
    getCourse.mockResolvedValue(courseWithLessons(3));
    countCompleted.mockResolvedValue(0);

    await lessonProgressService.getProgress("enr-1", courseId);
    await lessonProgressService.getProgress("enr-2", courseId);

    expect(getCourse).toHaveBeenCalledTimes(1);
    expect(countCompleted).toHaveBeenCalledTimes(2);
  });

  it("re-fetches the lesson count once the cached value is five minutes old", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const courseId = freshCourseId();
    getCourse.mockResolvedValue(courseWithLessons(3));
    countCompleted.mockResolvedValue(0);

    await lessonProgressService.getProgress("enr-1", courseId);

    vi.setSystemTime(new Date("2026-01-01T00:04:59.999Z"));
    await lessonProgressService.getProgress("enr-1", courseId);
    expect(getCourse).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-01-01T00:05:00.000Z"));
    await lessonProgressService.getProgress("enr-1", courseId);
    expect(getCourse).toHaveBeenCalledTimes(2);
  });
});

describe("lessonProgressService.markLessonComplete", () => {
  it("throws NotFoundError when the enrollment does not exist", async () => {
    findEnrollment.mockResolvedValue(null as never);

    await expect(
      lessonProgressService.markLessonComplete("enr-1", "lesson-1", OWNER)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when the enrollment belongs to someone else", async () => {
    arrange({ completed: 0, total: 3 });

    await expect(
      lessonProgressService.markLessonComplete("enr-1", "lesson-1", STRANGER)
    ).rejects.toThrow(ForbiddenError);
    expect(markComplete).not.toHaveBeenCalled();
  });

  it("checks ownership before status, so a stranger always gets ForbiddenError", async () => {
    arrange({ completed: 3, total: 3, status: EnrollmentStatus.COMPLETED });

    await expect(
      lessonProgressService.markLessonComplete("enr-1", "lesson-1", STRANGER)
    ).rejects.toThrow(ForbiddenError);
  });

  it.each([EnrollmentStatus.COMPLETED, EnrollmentStatus.DROPPED])(
    "throws ValidationError when the enrollment is %s",
    async (status) => {
      arrange({ completed: 0, total: 3, status });

      await expect(
        lessonProgressService.markLessonComplete("enr-1", "lesson-1", OWNER)
      ).rejects.toThrow(ValidationError);
      expect(markComplete).not.toHaveBeenCalled();
    }
  );

  it("records the lesson and reports progress while lessons remain", async () => {
    arrange({ completed: 1, total: 3 });

    const result = await lessonProgressService.markLessonComplete(
      "enr-1",
      "lesson-1",
      OWNER
    );

    expect(markComplete).toHaveBeenCalledWith("enr-1", "lesson-1");
    expect(result).toEqual({ completedCount: 1, totalLessons: 3 });
    expect(markEnrollmentCompleted).not.toHaveBeenCalled();
  });

  it.each([
    [3, 3],
    [4, 3],
  ])(
    "marks the enrollment completed when %i of %i lessons are done",
    async (completed, total) => {
      arrange({ completed, total });

      await lessonProgressService.markLessonComplete("enr-1", "lesson-1", OWNER);

      expect(markEnrollmentCompleted).toHaveBeenCalledWith("enr-1");
    }
  );

  it("never completes a course that has no lessons", async () => {
    arrange({ completed: 0, total: 0 });

    await lessonProgressService.markLessonComplete("enr-1", "lesson-1", OWNER);

    expect(markEnrollmentCompleted).not.toHaveBeenCalled();
  });
});