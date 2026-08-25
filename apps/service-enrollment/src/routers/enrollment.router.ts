import { Router } from "express";
import { enrollCourse, bulkEnrollCourse, dropCourse, getEnrollment } from "../controllers/enrollment.controller";
import { markLessonComplete } from "../controllers/lesson-progress.controller";
import {
    submitRating,
    updateRating,
    listCourseRatings,
    getAverageRating,
} from "../controllers/course-rating.controller";

const enrollmentRouter: Router = Router();

// Enrollment routes
enrollmentRouter.post("/", enrollCourse);
enrollmentRouter.post("/bulk", bulkEnrollCourse);
enrollmentRouter.patch("/:enrollment_id/drop", dropCourse);

// Lesson progress routes
enrollmentRouter.post("/:enrollment_id/lessons/:lesson_id/complete", markLessonComplete);

// Rating routes
enrollmentRouter.post("/:enrollment_id/rating", submitRating);
enrollmentRouter.patch("/:enrollment_id/rating", updateRating);
enrollmentRouter.get("/courses/:course_id/ratings", listCourseRatings);
enrollmentRouter.get("/courses/:course_id/ratings/average", getAverageRating);
enrollmentRouter.get("/:enrollment_id", getEnrollment);

export default enrollmentRouter;