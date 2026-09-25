import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { getPlatformStats } from "../services/admin-stats.service";

export async function getPlatformStatsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const stats = await getPlatformStats(req.accessToken!);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}