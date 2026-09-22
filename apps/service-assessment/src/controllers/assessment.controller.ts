import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { assessmentService } from "../services/assessment.service";

export async function createAssessmentController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const { course_id, title, passing_percentage, max_attempts } = req.body;
        const assessment = await assessmentService.createAssessment({
            course_id,
            tenant_id: req.user!.tenant_id,
            title,
            passing_percentage,
            max_attempts,
        });
        res.status(201).json({ success: true, data: assessment });
    } catch (err) {
        next(err);
    }
}

export async function addQuestionController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const assessment_id = req.params.assessment_id as string;
        const question = await assessmentService.addQuestion(assessment_id, req.body);
        res.status(201).json({ success: true, data: question });
    } catch (err) {
        next(err);
    }
}

export async function updateQuestionController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const question_id = req.params.question_id as string;
        const question = await assessmentService.updateQuestion(question_id, req.body);
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
        const assessment = await assessmentService.getAssessmentFull(assessment_id);
        res.status(200).json({ success: true, data: assessment });
    } catch (err) {
        next(err);
    }
}