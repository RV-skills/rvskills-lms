import { prisma } from "../db/prisma";
import{ Prisma } from "../generated/prisma/client";
import { QuestionType } from "../generated/prisma/enums";

export const questionRepository = {
    async create(
        data: {
            assessment_id: string,
            type: QuestionType,
            prompt: string,
            points?: number,
            order_index: number,
            options?: { text: string, is_correct: boolean } []
        },
        client: Prisma.TransactionClient = prisma
    ) {
        const { options, ...questionData } = data;
        return client.question.create({
            data: {
                ...questionData,
                options: options ? { create: options } : undefined,
            },
            include: { options: true },
        });
    },

    async findById(question_id: string, client: Prisma.TransactionClient = prisma) {
        return client.question.findUnique({
            where: { question_id },
            include: { options: true },
        });
    },

    async findByAssessmentId(assessment_id: string, client: Prisma.TransactionClient = prisma){
        return client.question.findMany({
            where: { assessment_id },
            orderBy: { order_index: "asc"},
            include: { options: true }
        });
    },

    async update(
        question_id: string,
        data: { prompt?: string, points?: number, order_index?: number},
        client: Prisma.TransactionClient = prisma
    ) {
        return client.question.update({
            where: { question_id },
            data,
        });
    },

    async lockAllForAssessment(assessment_id: string, client: Prisma.TransactionClient = prisma){
        return client.question.updateMany({
            where: { assessment_id },
            data: { is_locked: true },
        });
    },
}