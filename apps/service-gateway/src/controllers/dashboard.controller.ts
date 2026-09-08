import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { getMyLearning } from "../services/dashboard.service";

export async function getMyLearningController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await getMyLearning(req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}