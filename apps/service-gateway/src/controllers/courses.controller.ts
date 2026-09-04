import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { listCourses } from "../services/courses.service";

export async function listCoursesController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const courses = await listCourses(req.accessToken);
    res.status(200).json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
}