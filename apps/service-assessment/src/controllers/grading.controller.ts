import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { gradingService } from "../services/grading.service";
import { GradeAnswerSchema, PendingPageQuerySchema } from "../validators/grading.validator";

function viewerOf(req: AuthenticatedRequest) {
    return {
        isAdmin: req.user!.roles?.includes("Admin") ?? false,
        authHeader: req.headers.authorization!,
    };
}

export async function pendingReviewSummaryController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const summary = await gradingService.pendingReviewSummary(req.user!.tenant_id, viewerOf(req));
        res.status(200).json({ success: true, data: summary });
    } catch (err) {
        next(err);
    }
}

export async function listPendingReviewController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        // With ?assessment_id, return one page of that assessment's queue.
        if (req.query?.assessment_id) {
            const q = PendingPageQuerySchema.parse(req.query);
            const attempts = await gradingService.listPendingReviewPage(req.user!.tenant_id, viewerOf(req), {
                assessment_id: q.assessment_id,
                skip: q.offset,
                take: q.limit,
            });
            res.status(200).json({ success: true, data: attempts });
            return;
        }
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