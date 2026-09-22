import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { assessmentService } from "../services/assessment.service";

export async function startAttemptController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const assessment_id = req.params.assessment_id as string;
    const data = await assessmentService.startAttempt(assessment_id, req.accessToken!);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function submitAnswerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const attempt_id = req.params.attempt_id as string;
    const data = await assessmentService.submitAnswer(attempt_id, req.body, req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function submitAttemptController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const attempt_id = req.params.attempt_id as string;
    const data = await assessmentService.submitAttempt(attempt_id, req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}