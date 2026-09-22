import { NotFoundError, ValidationError } from "@rv-lms/shared-utils";
import { prisma } from "../db/prisma";
import { attemptRepository } from "../repositories/attempt.repository"
import { answerRepository } from "../repositories/answer.repository";
import { questionRepository } from "../repositories/question.repository";
import { assessmentRepository } from "../repositories/assessment.repository";
import { computeFinalScore } from "./scoring.util";

export const gradingService = {
    async listPendingReview(tenant_id: string) {
        return attemptRepository.findPendingReview(tenant_id);
    },

    async gradeAnswer(
        answer_id: string,
        data: { is_correct: boolean, points_awarded: number }
    ) {
        const answer = await prisma.answer.findUnique({
            where: { answer_id },
            include: { question: true, attempt: true },
        });

        if(!answer) {
            throw new NotFoundError("Answer not found");
        }

        if(answer.question.type !== "MANUAL") {
            throw new ValidationError(
                "Only manually-graded questionscan be graded through this endpoint"
            );
        }

        if(answer.attempt.status !== "PENDING_REVIEW") {
            throw new ValidationError(
                "This attempt is not waiting manual review"
            );
        }

        return prisma.$transaction(async (tx) => {
            await answerRepository.gradeAnswer(answer_id, data, tx);

            const attemptAnswers = await answerRepository.findByAttempt(
                answer.attempt_id,
                tx
            );

            const attemptQuestions = await questionRepository.findByAssessmentId(
                answer.attempt.assessment_id,
                tx
            );

            const manualQuestionIds = new Set(
                attemptQuestions.filter((q) => q.type === "MANUAL").map((q) => q.question_id)
            );

            const stillUngraded = attemptAnswers.some(
                (a) => manualQuestionIds.has(a.question_id) && a.points_awarded === null
            );

            const answeredManualQuestionIds = new Set(
                attemptAnswers.map((a) => a.question_id)
            );
            const hasUnansweredManualQuestions = [...manualQuestionIds].some(
                (qid) => !answeredManualQuestionIds.has(qid)
            );

            if (stillUngraded || hasUnansweredManualQuestions) {
                return attemptRepository.updateStatus(
                    answer.attempt_id,
                    { status: "PENDING_REVIEW" },
                    tx
                );
            }

            const assessment = await assessmentRepository.findById(
                answer.attempt.assessment_id,
                tx
            );
            if (!assessment) {
                throw new NotFoundError("Assessment not found");
            }

            const { scorePercentage, passed } = await computeFinalScore(
                answer.attempt.assessment_id,
                answer.attempt_id,
                assessment.passing_percentage,
                tx
            );

            return attemptRepository.updateStatus(
                answer.attempt_id,
                {
                    status: "GRADED",
                    score_percentage: scorePercentage,
                    passed,
                    graded_at: new Date(),
                },
                tx
            );
        });
    },
};