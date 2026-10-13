import { ForbiddenError, NotFoundError, ValidationError } from "@rv-lms/shared-utils";
import { prisma } from "../db/prisma";
import { attemptRepository } from "../repositories/attempt.repository"
import { answerRepository } from "../repositories/answer.repository";
import { questionRepository } from "../repositories/question.repository";
import { assessmentRepository } from "../repositories/assessment.repository";
import { courseServiceClient } from "../clients/course-service.client";
import { computeFinalScore } from "./scoring.util";

// null means every course (admins); otherwise only the courses this faculty teaches.
async function visibleCourseIds(viewer: { isAdmin: boolean; authHeader: string }) {
    return viewer.isAdmin ? null : courseServiceClient.listMyCourseIds(viewer.authHeader);
}

export const gradingService = {
    async pendingReviewSummary(tenant_id: string, viewer: { isAdmin: boolean; authHeader: string }) {
        const course_ids = await visibleCourseIds(viewer);
        if (course_ids && course_ids.length === 0) {
            return [];
        }
        const groups = await attemptRepository.countPendingByAssessment(tenant_id, course_ids);
        if (groups.length === 0) {
            return [];
        }
        const assessments = await assessmentRepository.findManyByIds(groups.map((g) => g.assessment_id));
        const byId = new Map(assessments.map((a) => [a.assessment_id, a]));

        return groups
            .map((g) => ({
                assessment_id: g.assessment_id,
                title: byId.get(g.assessment_id)?.title ?? "Assessment",
                course_id: byId.get(g.assessment_id)?.course_id ?? null,
                waiting: g._count._all,
                oldest_submitted_at: g._min.submitted_at,
            }))
            // Whatever has been waiting longest comes first.
            .sort((a, b) => (a.oldest_submitted_at?.getTime() ?? 0) - (b.oldest_submitted_at?.getTime() ?? 0));
    },

    async listPendingReviewPage(
        tenant_id: string,
        viewer: { isAdmin: boolean; authHeader: string },
        page: { assessment_id: string; skip: number; take: number }
    ) {
        const course_ids = await visibleCourseIds(viewer);
        if (course_ids && course_ids.length === 0) {
            return [];
        }
        return attemptRepository.findPendingReviewPage(tenant_id, course_ids, page);
    },

    async listPendingReview(tenant_id: string, viewer: { isAdmin: boolean; authHeader: string }) {
        const course_ids = viewer.isAdmin
            ? null
            : await courseServiceClient.listMyCourseIds(viewer.authHeader);

        if (course_ids && course_ids.length === 0) {
            return [];
        }
        return attemptRepository.findPendingReview(tenant_id, course_ids);
    },

    async gradeAnswer(
        answer_id: string,
        data: { is_correct: boolean, points_awarded: number, feedback?: string | null },
        authHeader: string
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
                "Only manually-graded questions can be graded through this endpoint"
            );
        }

        if (data.points_awarded > answer.question.points) {
            throw new ValidationError(
                `Points awarded can't be more than this question is worth (${answer.question.points})`
            );
        }

        if(answer.attempt.status !== "PENDING_REVIEW") {
            throw new ValidationError(
                "This attempt is not waiting manual review"
            );
        }

        const assessment = await assessmentRepository.findById(answer.attempt.assessment_id);
        if (!assessment) {
            throw new NotFoundError("Assessment not found");
        }

        const canGrade = await courseServiceClient.canEditCourse(assessment.course_id, authHeader);
        if (!canGrade) {
            throw new ForbiddenError("You do not teach this course, so you cannot grade this answer");
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