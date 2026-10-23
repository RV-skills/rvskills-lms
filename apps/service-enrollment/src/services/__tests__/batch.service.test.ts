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
});
