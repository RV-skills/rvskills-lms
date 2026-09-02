import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export function meController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  res.status(200).json({
    success: true,
    data: req.user,
  });
}