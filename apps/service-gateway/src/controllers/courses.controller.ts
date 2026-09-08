import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { listCourses, getCourseDetail } from "../services/courses.service";
import { NotFoundError } from "@rv-lms/shared-utils";

export async function listCoursesController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const courses = await listCourses(req.accessToken);
    res.status(200).json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
}

export async function getCourseDetailController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const course = await getCourseDetail(course_id, req.accessToken);
    if (!course) {
      throw new NotFoundError("Course not found");
    }
    res.status(200).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
}