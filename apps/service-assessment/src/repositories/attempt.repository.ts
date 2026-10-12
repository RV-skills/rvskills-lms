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

    async existsForAssessment(assessment_id: string, client: Prisma.TransactionClient = prisma) {
        const count = await client.assessmentAttempt.count({
            where: { assessment_id },
        });
        return count > 0;
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

    // course_ids null means "every course" (admins); otherwise only those courses.
    async findPendingReview(
        tenant_id: string,
        course_ids: string[] | null,
        client: Prisma.TransactionClient = prisma
    ) {
        return client.assessmentAttempt.findMany({
            where: {
                tenant_id,
                status: "PENDING_REVIEW",
                ...(course_ids ? { assessment: { course_id: { in: course_ids } } } : {}),
            },
            include: {
                assessment: { select: { assessment_id: true, title: true, course_id: true } },
                answers: {
                    include: {
                        question: { select: { question_id: true, prompt: true, type: true, points: true } },
                    },
                },
            },
            orderBy: { submitted_at: "asc" },
        });
    },

    async findInProgress(assessment_id: string, student_id: string, client: Prisma.TransactionClient = prisma) {
        return client.assessmentAttempt.findFirst({
            where: { assessment_id, student_id, status: "IN_PROGRESS" },
            orderBy: { attempt_number: "desc" },
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