import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { assessmentService } from "../services/assessment.service";

export async function listPendingReviewController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await assessmentService.listPendingReview(req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function gradeAnswerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const answer_id = req.params.answer_id as string;
    const data = await assessmentService.gradeAnswer(answer_id, req.body, req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}