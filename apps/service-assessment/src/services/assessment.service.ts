import { ForbiddenError, NotFoundError, ValidationError } from "@rv-lms/shared-utils";
import { courseServiceClient } from "../clients/course-service.client";
import { assessmentRepository } from "../repositories/assessment.repository";
import { QuestionType } from "../generated/prisma/enums";
import { questionRepository } from "../repositories/question.repository";

export const assessmentService = {
    async createAssessment(data: {
        course_id: string;
        tenant_id: string;
        title: string;
        passing_percentage: number;
        max_attempts?: number | null;
    }) {
        await courseServiceClient.getCourse(data.course_id);

        if(data.passing_percentage < 0 || data.passing_percentage > 100) {
            throw new ValidationError("passing_percentage must be between 0 and 100");
        }
        
        return assessmentRepository.create({
            ...data,
            max_attempts: data.max_attempts ?? null,
        });
    },

    async addQuestion(
        assessment_id: string,
        data: {
            type: QuestionType;
            prompt:string;
            points?: number;
            options: { text: string; is_correct: boolean }[];
        }
    ) {
        const assessment = await assessmentRepository.findById(assessment_id);
        if(!assessment) {
            throw new NotFoundError("Assessment not found");
        }

        if(data.type === "MCQ") {
            if(!data.options || data.options.length < 2) {
                throw new ValidationError("MCQ questions need at least 2 options");
            }

            const correctCount = data.options.filter((o) => o.is_correct).length;
            if(correctCount !== 1) {
                throw new ValidationError("MCQ questions must have exactly one correct option");
            }
        }
        const existingQuestions = await questionRepository.findByAssessmentId(assessment_id);
        const order_index = existingQuestions.length;

        return questionRepository.create({
            assessment_id,
            type: data.type,
            prompt: data.prompt,
            points: data.points,
            order_index,
            options: data.type === "MCQ" ? data.options : undefined,
        });
    },

    async updateQuestion(
        question_id: string,
        data: { prompt?: string, points?: number }
    ) {
        const question = await questionRepository.findById(question_id);
        if(!question) {
            throw new NotFoundError("Question not found");
        }
        if(question.is_locked) {
            throw new ForbiddenError(
                "This question can no longer be edited - a student has already attempted this assessment"
            );
        }
        return questionRepository.update(question_id, data);
    },

    async getAssessmentForStudent(assessment_id: string) {
        const assessment = await assessmentRepository.findByIdWithQuestions(assessment_id);
        if(!assessment) {
            throw new NotFoundError("Assessment not found");
        }

        return {
            ...assessment,
            questions: assessment.questions.map((q) => ({
                ...q,
                options: q.options.map((o) => ({
                    option_id: o.option_id,
                    text: o.text,
                })),
            })),
        };
    },
    
    async getAssessmentFull(assessment_id: string) {
        const assessment = await assessmentRepository.findByIdWithQuestions(assessment_id);
        if (!assessment) {
            throw new NotFoundError("Assessment not found");
        }
        return assessment;
    },

    async getAssessmentsForCourse(course_id: string, tenant_id: string) {
        return assessmentRepository.findManyByCourseId(course_id, tenant_id);
    },
}