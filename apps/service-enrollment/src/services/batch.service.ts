import { ConflictError, NotFoundError, ValidationError } from "@rv-lms/shared-utils";
import { Prisma } from "../generated/prisma/client";
import { EnrollmentStatus } from "../generated/prisma/enums";
import { prisma } from "../db/prisma";
import { batchRepository } from "../repositories/batch.repository";
import { enrollmentRepository } from "../repositories/enrollment.repository";
import { courseServiceClient } from "../clients/course-service.client";
import type { CreateBatchInput, UpdateBatchInput } from "../validators/batch.validator";

// Batch dates are stored as Postgres DATE columns. Prisma hands them back as midnight UTC,
// so the first 10 characters of the ISO string are the calendar date we stored.
export const toDay = (d: Date) => d.toISOString().slice(0, 10);
export const fromDay = (s: string) => new Date(`${s}T00:00:00Z`);

type BatchRow = {
    batch_id: string;
    course_id: string;
    name: string;
    start_date: Date;
    end_date: Date | null;
    module_dates?: { module_id: string; unlock_date: Date }[];
    _count?: { enrollments: number };
};

export interface BatchDTO {
    batch_id: string;
    course_id: string;
    name: string;
    start_date: string;
    end_date: string | null;
    student_count: number;
    module_dates: { module_id: string; unlock_date: string }[];
}

export function toBatchDTO(b: BatchRow): BatchDTO {
    return {
        batch_id: b.batch_id,
        course_id: b.course_id,
        name: b.name,
        start_date: toDay(b.start_date),
        end_date: b.end_date ? toDay(b.end_date) : null,
        student_count: b._count?.enrollments ?? 0,
        module_dates: (b.module_dates ?? []).map((m) => ({ module_id: m.module_id, unlock_date: toDay(m.unlock_date) })),
    };
}

function isUniqueViolation(err: unknown) {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

async function batchInCourse(course_id: string, batch_id: string) {
    const batch = await batchRepository.findById(batch_id);
    // Same answer whether the batch doesn't exist or belongs to another course.
    if (!batch || batch.course_id !== course_id) {
        throw new NotFoundError("Batch not found");
    }
    return batch;
}

export const batchService = {
    async list(course_id: string, tenant_id: string): Promise<BatchDTO[]> {
        const batches = await batchRepository.findByCourse(course_id, tenant_id);
        return batches.map(toBatchDTO);
    },

    async create(course_id: string, tenant_id: string, input: CreateBatchInput): Promise<BatchDTO> {
        try {
            const created = await batchRepository.create({
                tenant_id,
                course_id,
                name: input.name,
                start_date: fromDay(input.start_date),
                end_date: input.end_date ? fromDay(input.end_date) : null,
            });
            return toBatchDTO(created);
        } catch (err) {
            if (isUniqueViolation(err)) throw new ConflictError("This course already has a batch with that name");
            throw err;
        }
    },

    async update(course_id: string, batch_id: string, input: UpdateBatchInput): Promise<BatchDTO> {
        const batch = await batchInCourse(course_id, batch_id);

        const start = input.start_date ?? toDay(batch.start_date);
        const end = input.end_date === undefined ? (batch.end_date ? toDay(batch.end_date) : null) : input.end_date;
        if (end && end < start) {
            throw new ValidationError("End date can't be before the start date");
        }

        try {
            await batchRepository.update(batch_id, {
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.start_date !== undefined ? { start_date: fromDay(input.start_date) } : {}),
                ...(input.end_date !== undefined ? { end_date: input.end_date ? fromDay(input.end_date) : null } : {}),
            });
        } catch (err) {
            if (isUniqueViolation(err)) throw new ConflictError("This course already has a batch with that name");
            throw err;
        }
        return toBatchDTO((await batchRepository.findById(batch_id))!);
    },

    async remove(course_id: string, batch_id: string): Promise<void> {
        const batch = await batchInCourse(course_id, batch_id);
        if ((batch._count?.enrollments ?? 0) > 0) {
            throw new ConflictError("Move the students to another batch before deleting this one");
        }
        await batchRepository.delete(batch_id);
    },

    async setModuleDate(
        course_id: string,
        batch_id: string,
        module_id: string,
        unlock_date: string,
        authorization: string
    ): Promise<BatchDTO> {
        await batchInCourse(course_id, batch_id);
        const course = await courseServiceClient.getCourse(course_id, authorization);
        if (!(course.modules ?? []).some((m) => m.module_id === module_id)) {
            throw new NotFoundError("Module not found in this course");
        }
        await batchRepository.setModuleDate(batch_id, module_id, fromDay(unlock_date));
        return toBatchDTO((await batchRepository.findById(batch_id))!);
    },

    async clearModuleDate(course_id: string, batch_id: string, module_id: string): Promise<BatchDTO> {
        await batchInCourse(course_id, batch_id);
        await batchRepository.clearModuleDate(batch_id, module_id);
        return toBatchDTO((await batchRepository.findById(batch_id))!);
    },

    async roster(course_id: string, tenant_id: string) {
        return batchRepository.roster(course_id, tenant_id);
    },

    async setEnrollmentBatch(course_id: string, enrollment_id: string, batch_id: string | null) {
        const enrollment = await enrollmentRepository.findById(enrollment_id);
        if (!enrollment || enrollment.course_id !== course_id) {
            throw new NotFoundError("Enrollment not found");
        }
        if (batch_id) {
            await batchInCourse(course_id, batch_id);
        }
        // Progress lives on the enrolment, so moving between batches keeps it.
        const updated = await batchRepository.setEnrollmentBatch(enrollment_id, batch_id);
        return { enrollment_id: updated.enrollment_id, student_id: updated.student_id, batch_id: updated.batch_id };
    },

    // Admin bulk enrolment. Enrols each student in the course (or re-enrols a dropped one)
    // and, if a batch is given, puts every one of them in it, including students who were
    // already enrolled. Progress is kept for anyone already enrolled.
    async addToRoster(
        course_id: string,
        tenant_id: string,
        student_ids: string[],
        batch_id: string | null,
        authorization: string
    ) {
        if (batch_id) {
            await batchInCourse(course_id, batch_id);
        }
        const course = await courseServiceClient.getCourse(course_id, authorization);
        const ids = [...new Set(student_ids)];

        return prisma.$transaction(async (tx) => {
            // Same lock as single enrolment, so seat counts can't race.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${course_id}))`;

            const existing = await tx.enrollment.findMany({ where: { course_id, student_id: { in: ids } } });
            const byStudent = new Map(existing.map((e) => [e.student_id, e]));
            const toCreate = ids.filter((id) => !byStudent.has(id));
            const toReactivate = existing.filter((e) => e.status === EnrollmentStatus.DROPPED);

            if (course.max_seats !== null && course.max_seats !== undefined) {
                const active = await tx.enrollment.count({ where: { course_id, status: EnrollmentStatus.ACTIVE } });
                const needed = toCreate.length + toReactivate.length;
                if (active + needed > course.max_seats) {
                    throw new ConflictError(
                        `Not enough seats: ${course.max_seats - active} left, ${needed} needed`
                    );
                }
            }

            if (toCreate.length > 0) {
                await tx.enrollment.createMany({
                    data: toCreate.map((student_id) => ({ student_id, course_id, tenant_id, batch_id })),
                    skipDuplicates: true,
                });
            }
            if (toReactivate.length > 0) {
                await tx.enrollment.updateMany({
                    where: { enrollment_id: { in: toReactivate.map((e) => e.enrollment_id) } },
                    data: { status: EnrollmentStatus.ACTIVE, dropped_at: null },
                });
            }
            if (batch_id && existing.length > 0) {
                await tx.enrollment.updateMany({
                    where: { enrollment_id: { in: existing.map((e) => e.enrollment_id) } },
                    data: { batch_id },
                });
            }

            const reactivated = new Set(toReactivate.map((e) => e.student_id));
            return ids.map((student_id) => ({
                student_id,
                result: !byStudent.has(student_id)
                    ? ("enrolled" as const)
                    : reactivated.has(student_id)
                      ? ("re_enrolled" as const)
                      : ("already_enrolled" as const),
            }));
        });
    },
};
