import { prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma/client";
import { AttemptStatus } from "../generated/prisma/client";

export const attemptRepository = {
    async create (
        data: {
            assessment_id: string,
            student_id: string,
            tenant_id: string,
            attempt_number: number,
        },
        client: Prisma.TransactionClient = prisma
    ) {
        return client.assessmentAttempt.create({ data });
    },

    async findById(attempt_id: string, client: Prisma.TransactionClient= prisma) {
        return client.assessmentAttempt.findUnique({
            where: { attempt_id },
        });
    },

    async findByIdWithAnswers(attempt_id: string, client: Prisma.TransactionClient = prisma) {
        return client.assessmentAttempt.findUnique({
            where: { attempt_id },
            include: { answers: true },
        });
    },

    async countByAssessmentAndStudent(
        assessment_id: string,
        student_id: string,
        client: Prisma.TransactionClient = prisma
    ) {
        return client.assessmentAttempt.count({
            where: { assessment_id, student_id }
        });
    },

    async updateStatus(
        attempt_id: string,
        data: {
            status: AttemptStatus,
            score_percentage?: number | null,
            passed?: boolean | null,
            submitted_at?: Date,
            graded_at?: Date,
        },
        client: Prisma.TransactionClient = prisma
    ) {
        return client.assessmentAttempt.update({
            where: { attempt_id },
            data,
        });
    },

    async findPendingReview(tenant_id: string, client: Prisma.TransactionClient = prisma) {
        return client.assessmentAttempt.findMany({
            where: { tenant_id, status: "PENDING_REVIEW" },
            include: { answers: true },
        });
    },

    async findByAssessmentAndStudent(
        assessment_id: string,
        student_id: string,
        client: Prisma.TransactionClient = prisma
    ) {
        return client.assessmentAttempt.findMany({
            where: { assessment_id, student_id },
            orderBy: { attempt_number: "desc" },
        });
    },
}