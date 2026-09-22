import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { attemptService } from "../services/attempt.service";

export async function startAttemptController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const assessment_id = req.params.assessment_id as string;
        const authHeader = req.headers.authorization as string;
        const attempt = await attemptService.startAttempt(
            assessment_id,
            req.user!.user_id,
            req.user!.tenant_id,
            authHeader
        );
        res.status(201).json({ success: true, data: attempt });
    } catch (err) {
        next(err);
    }
}

export async function submitAnswerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const attempt_id = req.params.attempt_id as string;
        const answer = await attemptService.submitAnswer(attempt_id, req.user!.user_id, req.body);
        res.status(200).json({ success: true, data: answer });
    } catch (err) {
        next(err);
    }
}

export async function submitAttemptController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const attempt_id = req.params.attempt_id as string;
        const attempt = await attemptService.submitAttempt(attempt_id, req.user!.user_id);
        res.status(200).json({ success: true, data: attempt });
    } catch (err) {
        next(err);
    }
}