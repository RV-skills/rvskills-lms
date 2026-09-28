import { describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@rv-lms/shared-utils";
import { EnrollmentStatus } from "../../generated/prisma/enums";
import { courseRatingService } from "../course-rating.service";
import { enrollmentRepository } from "../../repositories/enrollment.repository";
import { courseRatingRepository } from "../../repositories/course-rating.repository";

vi.mock("../../repositories/enrollment.repository", () => ({
  enrollmentRepository: { findById: vi.fn() },
}));

vi.mock("../../repositories/course-rating.repository", () => ({
  courseRatingRepository: {
    findByEnrollment: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findByCourse: vi.fn(),
    getAverageRating: vi.fn(),
  },
}));

const OWNER = "student-1";
const STRANGER = "student-2";

const findEnrollment = vi.mocked(enrollmentRepository.findById);
const repoFindExisting = vi.mocked(courseRatingRepository.findByEnrollment);
const repoCreate = vi.mocked(courseRatingRepository.create);
const repoUpdate = vi.mocked(courseRatingRepository.update);

function anEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    enrollment_id: "enr-1",
    student_id: OWNER,
    course_id: "course-1",
    tenant_id: "tenant-1",
    status: EnrollmentStatus.COMPLETED,
    ...overrides,
  } as never;
}

describe("courseRatingService.submitRating", () => {
  it("throws NotFoundError when the enrollment does not exist", async () => {
    findEnrollment.mockResolvedValue(null as never);

    await expect(
      courseRatingService.submitRating("enr-1", OWNER, 5)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when the enrollment belongs to someone else", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());

    await expect(
      courseRatingService.submitRating("enr-1", STRANGER, 5)
    ).rejects.toThrow(ForbiddenError);
    expect(repoCreate).not.toHaveBeenCalled();
  });

  it("checks ownership before completion, so a stranger gets the same error whatever state the enrollment is in", async () => {
    findEnrollment.mockResolvedValue(
      anEnrollment({ status: EnrollmentStatus.ACTIVE })
    );

    await expect(
      courseRatingService.submitRating("enr-1", STRANGER, 5)
    ).rejects.toThrow(ForbiddenError);
  });

  it.each([EnrollmentStatus.ACTIVE, EnrollmentStatus.DROPPED])(
    "throws ValidationError when the enrollment is %s, not completed",
    async (status) => {
      findEnrollment.mockResolvedValue(anEnrollment({ status }));

      await expect(
        courseRatingService.submitRating("enr-1", OWNER, 5)
      ).rejects.toThrow(ValidationError);
      expect(repoCreate).not.toHaveBeenCalled();
    }
  );

  it("throws ConflictError when the student has already rated the course", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());
    repoFindExisting.mockResolvedValue({ rating_id: "r-1" } as never);

    await expect(
      courseRatingService.submitRating("enr-1", OWNER, 5)
    ).rejects.toThrow(ConflictError);
    expect(repoCreate).not.toHaveBeenCalled();
  });

  it("creates the rating using the course and tenant from the enrollment", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());
    repoFindExisting.mockResolvedValue(null as never);
    repoCreate.mockResolvedValue({ rating_id: "r-1" } as never);

    const result = await courseRatingService.submitRating(
      "enr-1",
      OWNER,
      4,
      "Great course"
    );

    expect(repoCreate).toHaveBeenCalledWith({
      enrollment_id: "enr-1",
      course_id: "course-1",
      tenant_id: "tenant-1",
      stars: 4,
      comment: "Great course",
    });
    expect(result).toEqual({ rating_id: "r-1" });
  });
});

describe("courseRatingService.updateRating", () => {
  it("throws NotFoundError when the enrollment does not exist", async () => {
    findEnrollment.mockResolvedValue(null as never);

    await expect(
      courseRatingService.updateRating("enr-1", OWNER, { stars: 3 })
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when the enrollment belongs to someone else", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());

    await expect(
      courseRatingService.updateRating("enr-1", STRANGER, { stars: 3 })
    ).rejects.toThrow(ForbiddenError);
    expect(repoUpdate).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when there is no rating to update", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());
    repoFindExisting.mockResolvedValue(null as never);

    await expect(
      courseRatingService.updateRating("enr-1", OWNER, { stars: 3 })
    ).rejects.toThrow(NotFoundError);
    expect(repoUpdate).not.toHaveBeenCalled();
  });

  it("updates the existing rating with the given fields", async () => {
    findEnrollment.mockResolvedValue(anEnrollment());
    repoFindExisting.mockResolvedValue({ rating_id: "r-1" } as never);
    repoUpdate.mockResolvedValue({ rating_id: "r-1", stars: 3 } as never);

    const result = await courseRatingService.updateRating("enr-1", OWNER, {
      stars: 3,
    });

    expect(repoUpdate).toHaveBeenCalledWith("enr-1", { stars: 3 });
    expect(result).toEqual({ rating_id: "r-1", stars: 3 });
  });
});

describe("courseRatingService reads", () => {
  it("lists a course's ratings within a tenant", async () => {
    vi.mocked(courseRatingRepository.findByCourse).mockResolvedValue([
      { rating_id: "r-1" },
    ] as never);

    const result = await courseRatingService.getCourseRatings(
      "course-1",
      "tenant-1"
    );

    expect(courseRatingRepository.findByCourse).toHaveBeenCalledWith(
      "course-1",
      "tenant-1"
    );
    expect(result).toEqual([{ rating_id: "r-1" }]);
  });

  it("returns a course's average rating", async () => {
    vi.mocked(courseRatingRepository.getAverageRating).mockResolvedValue({
      average: 4.5,
      count: 2,
    } as never);

    const result = await courseRatingService.getAverageRating("course-1");

    expect(courseRatingRepository.getAverageRating).toHaveBeenCalledWith(
      "course-1"
    );
    expect(result).toEqual({ average: 4.5, count: 2 });
  });
});