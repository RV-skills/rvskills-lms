import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { getCoursePlayerData } from "../services/course-player.service";
import { NotFoundError, ValidationError } from "@rv-lms/shared-utils";

export async function getCoursePlayerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const enrollment_id = req.query.enrollment_id as string | undefined;

    if (!enrollment_id) {
      throw new ValidationError("enrollment_id query parameter is required");
    }

    const data = await getCoursePlayerData(course_id, enrollment_id, req.accessToken!);
    if (!data) {
      throw new NotFoundError("Course not found");
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}