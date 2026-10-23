import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { enrollCourse, bulkEnrollCourse, dropCourse, getEnrollment, getMyEnrollments, getCompletedLessons, countAllEnrollments, countEnrollmentsByCourse } from "../controllers/enrollment.controller";
import { markLessonComplete } from "../controllers/lesson-progress.controller";
import {
    submitRating,
    updateRating,
    listCourseRatings,
    getAverageRating,
} from "../controllers/course-rating.controller";
import { requirePermission } from "../middlewares/rbac.middleware";
import { requireCourseEditor } from "../middlewares/course-editor.middleware";
import {
    listBatches,
    createBatch,
    updateBatch,
    deleteBatch,
    setModuleDate,
    clearModuleDate,
    getRoster,
    setEnrollmentBatch,
} from "../controllers/batch.controller";

const enrollmentRouter: Router = Router();

enrollmentRouter.get("/my-enrollments", authMiddleware, getMyEnrollments);

// Batches and release schedules: admins and the course's own faculty.
const canWrite = requirePermission("course:write");
enrollmentRouter.get("/courses/:course_id/batches", authMiddleware, canWrite, requireCourseEditor, listBatches);
enrollmentRouter.post("/courses/:course_id/batches", authMiddleware, canWrite, requireCourseEditor, createBatch);
enrollmentRouter.patch("/courses/:course_id/batches/:batch_id", authMiddleware, canWrite, requireCourseEditor, updateBatch);
enrollmentRouter.delete("/courses/:course_id/batches/:batch_id", authMiddleware, canWrite, requireCourseEditor, deleteBatch);
enrollmentRouter.put("/courses/:course_id/batches/:batch_id/modules/:module_id", authMiddleware, canWrite, requireCourseEditor, setModuleDate);
enrollmentRouter.delete("/courses/:course_id/batches/:batch_id/modules/:module_id", authMiddleware, canWrite, requireCourseEditor, clearModuleDate);
enrollmentRouter.get("/courses/:course_id/roster", authMiddleware, canWrite, requireCourseEditor, getRoster);
enrollmentRouter.patch("/courses/:course_id/enrollments/:enrollment_id/batch", authMiddleware, canWrite, requireCourseEditor, setEnrollmentBatch);

// Enrollment routes
enrollmentRouter.post("/", authMiddleware, enrollCourse);
enrollmentRouter.post("/bulk", authMiddleware, requirePermission("user:write"), bulkEnrollCourse);
enrollmentRouter.patch("/:enrollment_id/drop", authMiddleware, dropCourse);
// Lesson progress routes
enrollmentRouter.post("/:enrollment_id/lessons/:lesson_id/complete", authMiddleware, markLessonComplete);
// Rating routes
enrollmentRouter.post("/:enrollment_id/rating", authMiddleware, submitRating);
enrollmentRouter.patch("/:enrollment_id/rating", authMiddleware, updateRating);
enrollmentRouter.get("/:enrollment_id/completed-lessons", authMiddleware, getCompletedLessons);
enrollmentRouter.get("/courses/:course_id/ratings", listCourseRatings);
enrollmentRouter.get("/courses/:course_id/ratings/average", getAverageRating);
enrollmentRouter.get("/:enrollment_id", authMiddleware, getEnrollment);
enrollmentRouter.get('/admin/count', authMiddleware, requirePermission('user:write'), countAllEnrollments);
enrollmentRouter.get("/admin/counts-by-course", authMiddleware, requirePermission("user:write"), countEnrollmentsByCourse);
export default enrollmentRouter;
