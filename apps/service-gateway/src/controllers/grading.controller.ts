import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { assessmentService } from "../services/assessment.service";
import { getUsersByIds } from "../services/users.service";

export async function listPendingReviewController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const assessment_id = typeof req.query?.assessment_id === "string" ? req.query.assessment_id : undefined;
    const attempts = (
      assessment_id
        ? await assessmentService.listPendingReviewPage(
            {
              assessment_id,
              offset: Number(req.query.offset ?? 0) || 0,
              limit: Number(req.query.limit ?? 20) || 20,
            },
            req.accessToken!
          )
        : await assessmentService.listPendingReview(req.accessToken!)
    ) as { student_id: string }[];

    // Faculty need a name, not an ID. If the lookup fails, the queue still loads.
    const ids = [...new Set(attempts.map((a) => a.student_id))];
    let nameById = new Map<string, string>();
    if (ids.length > 0) {
      try {
        const users = await getUsersByIds(ids, req.accessToken!);
        nameById = new Map(users.map((u) => [u.user_id, `${u.first_name} ${u.last_name}`]));
      } catch {
        // keep the fallback below
      }
    }

    const data = attempts.map((a) => ({ ...a, student_name: nameById.get(a.student_id) ?? "Student" }));
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

export async function pendingReviewSummaryController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await assessmentService.pendingReviewSummary(req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
