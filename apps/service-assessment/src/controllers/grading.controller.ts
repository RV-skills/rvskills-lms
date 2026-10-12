import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { gradingService } from "../services/grading.service";
import { GradeAnswerSchema } from "../validators/grading.validator";

export async function listPendingReviewController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const attempts = await gradingService.listPendingReview(req.user!.tenant_id, {
            isAdmin: req.user!.roles?.includes("Admin") ?? false,
            authHeader: req.headers.authorization!,
        });
        res.status(200).json({ success: true, data: attempts });
    } catch (err) {
        next(err);
    }
}

export async function gradeAnswerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const answer_id = req.params.answer_id as string;
        const data = GradeAnswerSchema.parse(req.body);
        const attempt = await gradingService.gradeAnswer(answer_id, data, req.headers.authorization!);
        res.status(200).json({ success: true, data: attempt });
    } catch (err) {
        next(err);
    }
}