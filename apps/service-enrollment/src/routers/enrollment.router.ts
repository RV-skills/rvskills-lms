import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { enrollCourse, bulkEnrollCourse, dropCourse, getEnrollment, getMyEnrollments } from "../controllers/enrollment.controller";
import { markLessonComplete } from "../controllers/lesson-progress.controller";
import {
    submitRating,
    updateRating,
    listCourseRatings,
    getAverageRating,
} from "../controllers/course-rating.controller";
import { requirePermission } from "../middlewares/rbac.middleware";

const enrollmentRouter: Router = Router();

enrollmentRouter.get("/my-enrollments", authMiddleware, getMyEnrollments);

// Enrollment routes
enrollmentRouter.post("/", authMiddleware, enrollCourse);
enrollmentRouter.post("/bulk", authMiddleware, requirePermission("course:write"), bulkEnrollCourse);
enrollmentRouter.patch("/:enrollment_id/drop", authMiddleware, dropCourse);
// Lesson progress routes
enrollmentRouter.post("/:enrollment_id/lessons/:lesson_id/complete", authMiddleware, markLessonComplete);
// Rating routes
enrollmentRouter.post("/:enrollment_id/rating", authMiddleware, submitRating);
enrollmentRouter.patch("/:enrollment_id/rating", authMiddleware, updateRating);
enrollmentRouter.get("/courses/:course_id/ratings", listCourseRatings);
enrollmentRouter.get("/courses/:course_id/ratings/average", getAverageRating);
enrollmentRouter.get("/:enrollment_id", getEnrollment);

export default enrollmentRouter;