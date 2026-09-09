import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { enrollInCourse } from "../services/enrollment.service";

export async function enrollInCourseController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { course_id } = req.body as { course_id: string };
    const enrollment = await enrollInCourse(course_id, req.accessToken!);
    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    next(err);
  }
}