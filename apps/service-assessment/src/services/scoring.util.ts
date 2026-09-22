import { Prisma } from "../generated/prisma/client";

export async function computeFinalScore(
    assessment_id: string,
    attempt_id: string,
    passing_percentage: number,
    tx: Prisma.TransactionClient
) {
    const questions = await tx.question.findMany({ where: { assessment_id } });
    const answers = await tx.answer.findMany({ where: { attempt_id } });

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const awardedPoints = answers.reduce((sum, a) => sum + (a.points_awarded ?? 0), 0);

    const scorePercentage = totalPoints > 0 ? Math.round((awardedPoints / totalPoints) * 100) : 0;
    const passed = scorePercentage >= passing_percentage;

    return { scorePercentage, passed };
}