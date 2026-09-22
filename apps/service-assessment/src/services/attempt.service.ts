import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@rv-lms/shared-utils";
import { assessmentRepository } from "../repositories/assessment.repository"
import { attemptRepository } from "../repositories/attempt.repository";
import { prisma } from "../db/prisma";
import { questionRepository } from "../repositories/question.repository";
import { answerRepository } from "../repositories/answer.repository";
import { computeFinalScore } from "./scoring.util";
import { enrollmentServiceClient } from "../clients/enrollment-service.client";

export const attemptService = {
    async startAttempt(assessment_id: string, student_id: string, tenant_id: string, authHeader:string) {
        const assessment = await assessmentRepository.findById(assessment_id);
        if(!assessment) {
            throw new NotFoundError("Assessment not found");
        }

        const isEnrolled = await enrollmentServiceClient.isEnrolledInCourse(
            assessment.course_id,
            authHeader
        );
        if (!isEnrolled) {
            throw new ForbiddenError("You must be enrolled in this course to take this assessment");
        }

        const existingCount = await attemptRepository.countByAssessmentAndStudent(
            assessment_id,
            student_id,
        );
        
        if (assessment.max_attempts !== null && existingCount >= assessment.max_attempts) {
            throw new ConflictError(
                `You have used all ${assessment.max_attempts} allowed attempts for this assessment`
            );
        }

        return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${assessment_id} || ${student_id}))`;

            const attempt = await attemptRepository.create(
                {
                    assessment_id,
                    student_id,
                    tenant_id,
                    attempt_number: existingCount + 1,
                },
                tx
            );
            
            await questionRepository.lockAllForAssessment(assessment_id, tx);

            return attempt;
        });
    },

    async submitAnswer(
        attempt_id: string,
        student_id: string,
        data: { question_id: string, selected_option_id?: string, text_response?: string }
    ) {
        const attempt = await attemptRepository.findById(attempt_id);
        if(!attempt) {
            throw new NotFoundError("Attempt not found");
        }

        if(attempt.student_id !== student_id) {
            throw new ForbiddenError("You do not have permission to modify this attempt");
        }
        
        if(attempt.status !== "IN_PROGRESS") {
            throw new ValidationError("This attempt has already been submitted");
        }

        const question = await questionRepository.findById(data.question_id);
        if(!question || question.assessment_id != attempt.assessment_id) {
            throw new NotFoundError("Question not found for this assessment");
        }

        return answerRepository.upsert({
            attempt_id,
            question_id: data.question_id,
            selected_option_id: data.selected_option_id ?? null,
            text_response: data.text_response ?? null,
        });
    },

    async submitAttempt(attempt_id:string, student_id: string) {
        const attempt = await attemptRepository.findByIdWithAnswers(attempt_id);
        if(!attempt) {
            throw new NotFoundError("Attempt not found");
        }
        
        if(attempt.student_id !== student_id) {
            throw new ForbiddenError("You do not have permission to submit this attempt");
        }

        if(attempt.status !== "IN_PROGRESS") {
            throw new ValidationError("This attempt has already been submitted");
        }

        const questions = await questionRepository.findByAssessmentId(attempt.assessment_id);
        const assessment = await assessmentRepository.findById(attempt.assessment_id);

        if(!assessment) {
            throw new NotFoundError("Assessment not found");
        }

        return prisma.$transaction(async (tx) => {
            let hasManualQuestions = false;

            for(const question of questions) {
                if(question.type !== "MCQ") {
                    hasManualQuestions = true;
                    continue;
                }

                const answer = attempt.answers.find((a) => a.question_id === question.question_id);
                const correctOption = question.options.find((o) => o.is_correct);
                const isCorrect = !!answer?.selected_option_id && answer.selected_option_id == correctOption?.option_id;

                if(answer) {
                    await tx.answer.update({
                        where: { answer_id: answer.answer_id },
                        data: {
                            is_correct: isCorrect,
                            points_awarded: isCorrect ? question.points : 0,
                        },
                    });
                }
            }

            if(hasManualQuestions) {
                return attemptRepository.updateStatus(
                    attempt_id,
                    { status: "PENDING_REVIEW", submitted_at: new Date()},
                    tx
                );
            }

            const { scorePercentage, passed } = await computeFinalScore(
                attempt.assessment_id,
                attempt_id,
                assessment.passing_percentage,
                tx
            );

            return attemptRepository.updateStatus(
                attempt_id,
                {
                    status: "GRADED",
                    score_percentage: scorePercentage,
                    passed,
                    submitted_at: new Date(),
                    graded_at: new Date(),
                },
                tx
            );
        });
    },
};