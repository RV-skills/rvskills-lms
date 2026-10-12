import { prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma/client";

export const answerRepository = { 
    async upsert (
        data: {
            attempt_id: string,
            question_id: string,
            selected_option_id: string | null,
            text_response?: string | null,
        },
        client: Prisma.TransactionClient = prisma
    ) {
        return client.answer.upsert({
            where: {
                attempt_id_question_id: {
                    attempt_id: data.attempt_id,
                    question_id: data.question_id
                },
            },
            update: {
                selected_option_id: data.selected_option_id,
                text_response: data.text_response,
            },
            create: data,
        });
    },

    async findByAttempt(attempt_id: string, client: Prisma.TransactionClient = prisma) {
        return client.answer.findMany({
            where: { attempt_id },
        });
    },

    async gradeAnswer(
        answer_id: string,
        data: { is_correct: boolean, points_awarded: number, feedback?: string | null },
        client: Prisma.TransactionClient = prisma
    ) {
        return client.answer.update({
            where: { answer_id },
            data,
        });
    },

    // Teacher comments on these attempts, for showing alongside a student's results.
    async findFeedbackByAttempts(attempt_ids: string[], client: Prisma.TransactionClient = prisma) {
        return client.answer.findMany({
            where: { attempt_id: { in: attempt_ids }, feedback: { not: null } },
            select: {
                attempt_id: true,
                feedback: true,
                question: { select: { prompt: true, order_index: true } },
            },
        });
    },
}