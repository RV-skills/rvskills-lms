import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "@rv-lms/shared-utils";

vi.mock("../../generated/prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    constructor(message: string, public code: string) {
      super(message);
    }
  }
  return { Prisma: { PrismaClientKnownRequestError } };
});
const tx = {
  $executeRaw: vi.fn(),
  enrollment: { findMany: vi.fn(), count: vi.fn(), createMany: vi.fn(), updateMany: vi.fn() },
};
vi.mock("../../db/prisma", () => ({
  prisma: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) },
}));
vi.mock("../../generated/prisma/enums", () => ({
  EnrollmentStatus: { ACTIVE: "ACTIVE", COMPLETED: "COMPLETED", DROPPED: "DROPPED" },
}));
vi.mock("../../repositories/batch.repository", () => ({
  batchRepository: {
    findByCourse: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setModuleDate: vi.fn(),
    clearModuleDate: vi.fn(),
    roster: vi.fn(),
    setEnrollmentBatch: vi.fn(),
  },
}));
vi.mock("../../repositories/enrollment.repository", () => ({ enrollmentRepository: { findById: vi.fn() } }));
vi.mock("../../clients/course-service.client", () => ({ courseServiceClient: { getCourse: vi.fn() } }));

import { Prisma } from "../../generated/prisma/client";
import { batchService, toBatchDTO } from "../batch.service";
import { batchRepository } from "../../repositories/batch.repository";
import { enrollmentRepository } from "../../repositories/enrollment.repository";
import { courseServiceClient } from "../../clients/course-service.client";

const repo = vi.mocked(batchRepository);
const day = (s: string) => new Date(`${s}T00:00:00Z`);

function aBatch(overrides: object = {}) {
  return {
    batch_id: "b-1",
    tenant_id: "t",
    course_id: "c-1",
    name: "Nov 2026",
    start_date: day("2026-11-01"),
    end_date: day("2027-05-31"),
    module_dates: [{ batch_id: "b-1", module_id: "m-2", unlock_date: day("2026-11-20") }],
    _count: { enrollments: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.findById.mockResolvedValue(aBatch() as never);
});

describe("batchService", () => {
  it("returns dates as plain calendar days", () => {
    expect(toBatchDTO(aBatch() as never)).toMatchObject({
      start_date: "2026-11-01",
      end_date: "2027-05-31",
      module_dates: [{ module_id: "m-2", unlock_date: "2026-11-20" }],
    });
  });

  it("reports a duplicate batch name as a conflict", async () => {
    const PrismaError = Prisma.PrismaClientKnownRequestError as unknown as new (m: string, c: string) => Error;
    repo.create.mockRejectedValue(new PrismaError("dup", "P2002"));
    await expect(
      batchService.create("c-1", "t", { name: "Nov 2026", start_date: "2026-11-01" })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("treats a batch from another course as not found", async () => {
    repo.findById.mockResolvedValue(aBatch({ course_id: "other" }) as never);
    await expect(batchService.update("c-1", "b-1", { name: "x" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses an end date before the start, using the stored dates for what wasn't sent", async () => {
    await expect(batchService.update("c-1", "b-1", { start_date: "2027-06-01" })).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("won't delete a batch that still has students", async () => {
    repo.findById.mockResolvedValue(aBatch({ _count: { enrollments: 3 } }) as never);
    await expect(batchService.remove("c-1", "b-1")).rejects.toBeInstanceOf(ConflictError);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("only sets a date for a module that belongs to the course", async () => {
    vi.mocked(courseServiceClient.getCourse).mockResolvedValue({ modules: [{ module_id: "m-1" }] } as never);
    await expect(
      batchService.setModuleDate("c-1", "b-1", "m-9", "2026-11-10", "Bearer x")
    ).rejects.toBeInstanceOf(NotFoundError);

    await batchService.setModuleDate("c-1", "b-1", "m-1", "2026-11-10", "Bearer x");
    expect(repo.setModuleDate).toHaveBeenCalledWith("b-1", "m-1", day("2026-11-10"));
  });

  it("moves a student only within their own course", async () => {
    vi.mocked(enrollmentRepository.findById).mockResolvedValue({ enrollment_id: "e-1", course_id: "other" } as never);
    await expect(batchService.setEnrollmentBatch("c-1", "e-1", "b-1")).rejects.toBeInstanceOf(NotFoundError);

    vi.mocked(enrollmentRepository.findById).mockResolvedValue({ enrollment_id: "e-1", course_id: "c-1" } as never);
    repo.setEnrollmentBatch.mockResolvedValue({ enrollment_id: "e-1", student_id: "s", batch_id: "b-1" } as never);
    await expect(batchService.setEnrollmentBatch("c-1", "e-1", "b-1")).resolves.toEqual({
      enrollment_id: "e-1",
      student_id: "s",
      batch_id: "b-1",
    });
  });

  describe("addToRoster", () => {
    beforeEach(() => {
      vi.mocked(courseServiceClient.getCourse).mockResolvedValue({ max_seats: null, modules: [] } as never);
      tx.enrollment.findMany.mockResolvedValue([
        { enrollment_id: "e-a", student_id: "a", status: "ACTIVE" },
        { enrollment_id: "e-d", student_id: "d", status: "DROPPED" },
      ]);
      tx.enrollment.count.mockResolvedValue(5);
    });

    it("enrols new students, re-enrols dropped ones and moves everyone into the batch", async () => {
      const result = await batchService.addToRoster("c-1", "t", ["a", "d", "n", "n"], "b-1", "Bearer x");

      expect(tx.enrollment.createMany).toHaveBeenCalledWith({
        data: [{ student_id: "n", course_id: "c-1", tenant_id: "t", batch_id: "b-1" }],
        skipDuplicates: true,
      });
      expect(tx.enrollment.updateMany).toHaveBeenCalledWith({
        where: { enrollment_id: { in: ["e-d"] } },
        data: { status: "ACTIVE", dropped_at: null },
      });
      expect(tx.enrollment.updateMany).toHaveBeenCalledWith({
        where: { enrollment_id: { in: ["e-a", "e-d"] } },
        data: { batch_id: "b-1" },
      });
      expect(result).toEqual([
        { student_id: "a", result: "already_enrolled" },
        { student_id: "d", result: "re_enrolled" },
        { student_id: "n", result: "enrolled" },
      ]);
    });

    it("refuses when the course doesn't have enough seats left", async () => {
      vi.mocked(courseServiceClient.getCourse).mockResolvedValue({ max_seats: 6, modules: [] } as never);
      await expect(batchService.addToRoster("c-1", "t", ["a", "d", "n"], null, "Bearer x")).rejects.toBeInstanceOf(
        ConflictError
      );
      expect(tx.enrollment.createMany).not.toHaveBeenCalled();
    });
  });
});
