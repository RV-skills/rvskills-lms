import { prisma } from "../db/prisma";
import { EnrollmentStatus } from "../generated/prisma/enums";

const activeStudents = { status: { not: EnrollmentStatus.DROPPED } };

export const batchRepository = {
    async findByCourse(course_id: string, tenant_id: string) {
        return prisma.batch.findMany({
            where: { course_id, tenant_id },
            orderBy: { start_date: "asc" },
            include: {
                module_dates: true,
                _count: { select: { enrollments: { where: activeStudents } } },
            },
        });
    },

    async findById(batch_id: string) {
        return prisma.batch.findUnique({
            where: { batch_id },
            include: {
                module_dates: true,
                _count: { select: { enrollments: { where: activeStudents } } },
            },
        });
    },

    async create(data: { tenant_id: string; course_id: string; name: string; start_date: Date; end_date: Date | null }) {
        return prisma.batch.create({ data });
    },

    async update(batch_id: string, data: { name?: string; start_date?: Date; end_date?: Date | null }) {
        return prisma.batch.update({ where: { batch_id }, data });
    },

    async delete(batch_id: string) {
        return prisma.batch.delete({ where: { batch_id } });
    },

    async setModuleDate(batch_id: string, module_id: string, unlock_date: Date) {
        return prisma.batchModuleDate.upsert({
            where: { batch_id_module_id: { batch_id, module_id } },
            create: { batch_id, module_id, unlock_date },
            update: { unlock_date },
        });
    },

    async clearModuleDate(batch_id: string, module_id: string) {
        return prisma.batchModuleDate.deleteMany({ where: { batch_id, module_id } });
    },

    async roster(course_id: string, tenant_id: string) {
        return prisma.enrollment.findMany({
            where: { course_id, tenant_id, ...activeStudents },
            orderBy: { enrolled_at: "asc" },
            select: { enrollment_id: true, student_id: true, batch_id: true, status: true, enrolled_at: true },
        });
    },

    async setEnrollmentBatch(enrollment_id: string, batch_id: string | null) {
        return prisma.enrollment.update({ where: { enrollment_id }, data: { batch_id } });
    },
};
