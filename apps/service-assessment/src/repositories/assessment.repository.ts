import { prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma/client";
export const assessmentRepository = {
    async create(
        data: {
            course_id: string,
            tenant_id: string,
            title: string,
            passing_percentage: number,
            max_attempts: number | null
        },
        client: Prisma.TransactionClient = prisma
    ) {
        return client.assessment.create({ data });
    },

    async findById(assessment_id: string, client: Prisma.TransactionClient = prisma) {
        return client.assessment.findUnique({
            where: { assessment_id },
        });
    },

    async update(
        assessment_id: string,
        data: { title?: string, passing_percentage?: number, max_attempts?: number | null },
        client: Prisma.TransactionClient = prisma
    ) {
        return client.assessment.update({ where: { assessment_id }, data });
    },

    async findManyByIds(assessment_ids: string[], client: Prisma.TransactionClient = prisma) {
        return client.assessment.findMany({
            where: { assessment_id: { in: assessment_ids } },
            select: { assessment_id: true, title: true, course_id: true },
        });
    },

    async findManyByCourseId(course_id: string, tenant_id: string, client: Prisma.TransactionClient = prisma) {
        return client.assessment.findMany({
            where: { course_id, tenant_id },
        });
    },

    async findByIdWithQuestions(assessment_id:string, client: Prisma.TransactionClient = prisma) {
        return client.assessment.findUnique({
            where: { assessment_id },
            include: {
                questions: {
                    orderBy: { order_index: "asc"},
                    include: { options: true },
                },
            },
        });
    },
};