import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { courseServiceClient } from "../clients/course-service.client";

// For routes under /courses/:course_id that change a course's batches.
// Admins and the faculty assigned to the course get through; everyone else gets 403.
export const requireCourseEditor = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const course_id = req.params.course_id as string;
    courseServiceClient
        .assertCanEdit(course_id, req.headers.authorization as string)
        .then(() => next())
        .catch(next);
};
