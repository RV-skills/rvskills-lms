import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { enrollInCourse, getMyEnrollments } from "../services/enrollment.service";

export async function enrollInCourseController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { course_id } = req.body as { course_id: string };
    const enrollment = await enrollInCourse(course_id, req.accessToken!);
    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    next(err);
  }
}

export async function getMyEnrollmentsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const enrollments = await getMyEnrollments(req.accessToken!);
    res.status(200).json({ success: true, data: enrollments });
  } catch (err) {
    next(err);
  }
}