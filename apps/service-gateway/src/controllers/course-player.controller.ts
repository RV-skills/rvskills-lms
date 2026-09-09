import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { getCoursePlayerData } from "../services/course-player.service";
import { NotFoundError } from "@rv-lms/shared-utils";

export async function getCoursePlayerController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const data = await getCoursePlayerData(course_id, req.accessToken!);
    if (!data) {
      throw new NotFoundError("Course not found");
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}