import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { assessmentService } from "../services/assessment.service";
import { AddQuestionSchema, CreateAssessmentSchema, UpdateQuestionSchema } from "../validators/assessment.validator";

export async function createAssessmentController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const input = CreateAssessmentSchema.parse(req.body);
        const assessment = await assessmentService.createAssessment(
            { ...input, tenant_id: req.user!.tenant_id },
            req.headers.authorization!
        );
        res.status(201).json({ success: true, data: assessment });
    } catch (err) {
        next(err);
    }
}

export async function addQuestionController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const assessment_id = req.params.assessment_id as string;
        const input = AddQuestionSchema.parse(req.body);
        const question = await assessmentService.addQuestion(assessment_id, input, req.headers.authorization!);
        res.status(201).json({ success: true, data: question });
    } catch (err) {
        next(err);
    }
}

export async function updateQuestionController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const question_id = req.params.question_id as string;
        const input = UpdateQuestionSchema.parse(req.body);
        const question = await assessmentService.updateQuestion(question_id, input, req.headers.authorization!);
        res.status(200).json({ success: true, data: question });
    } catch (err) {
        next(err);
    }
}

export async function listAssessmentsForCourseController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const course_id = req.params.course_id as string;
        const assessments = await assessmentService.getAssessmentsForCourse(course_id, req.user!.tenant_id);
        res.status(200).json({ success: true, data: assessments });
    } catch (err) {
        next(err);
    }
}

export async function getAssessmentController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const assessment_id = req.params.assessment_id as string;
        const assessment = await assessmentService.getAssessmentForStudent(assessment_id);
        res.status(200).json({ success: true, data: assessment });
    } catch (err) {
        next(err);
    }
}

export async function getAssessmentFullController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const assessment_id = req.params.assessment_id as string;
        const assessment = await assessmentService.getAssessmentFull(assessment_id, req.headers.authorization!);
        res.status(200).json({ success: true, data: assessment });
    } catch (err) {
        next(err);
    }
}