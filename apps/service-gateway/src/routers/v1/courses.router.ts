import { Router } from "express";
import { publicRouteMiddleware } from "../../middlewares/public-route.middleware";
import {
  listCoursesController,
  getCourseDetailController,
  listCourseRatingsController,
  getAverageRatingController,
  submitRatingController,
  updateRatingController,
  markLessonCompleteController,
  listCoursesForAdminController,
  publishCourseController,
  unpublishCourseController,
  listCourseFacultyController,
  assignCourseFacultyController,
  removeCourseFacultyController,
  listMyCoursesController,
  createCourseController,
  createModuleController,
  updateModuleController,
  deleteModuleController,
  createLessonController,
  updateLessonController,
  deleteLessonController,
  updateCourseController,
  setLessonVideoController,
  removeLessonVideoController,
  addLessonResourceController,
  removeLessonResourceController,
} from "../../controllers/courses.controller";
import { getCoursePlayerController } from "../../controllers/course-player.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const coursesRouter: Router = Router();

coursesRouter.get("/", publicRouteMiddleware, listCoursesController);
coursesRouter.get("/mine", authMiddleware, listMyCoursesController);
coursesRouter.get("/:course_id/player", authMiddleware, getCoursePlayerController);
coursesRouter.get("/:course_id/ratings", publicRouteMiddleware, listCourseRatingsController);
coursesRouter.get("/:course_id/ratings/average", publicRouteMiddleware, getAverageRatingController);
coursesRouter.post("/:course_id/ratings", authMiddleware, submitRatingController);
coursesRouter.patch("/:course_id/ratings", authMiddleware, updateRatingController);

coursesRouter.get("/:course_id", publicRouteMiddleware, getCourseDetailController);
coursesRouter.patch("/:course_id", authMiddleware, updateCourseController);
coursesRouter.post("/:course_id/modules", authMiddleware, createModuleController);
coursesRouter.patch("/:course_id/modules/:module_id", authMiddleware, updateModuleController);
coursesRouter.delete("/:course_id/modules/:module_id", authMiddleware, deleteModuleController);
coursesRouter.post("/:course_id/modules/:module_id/lessons", authMiddleware, createLessonController);
coursesRouter.patch("/:course_id/modules/:module_id/lessons/:lesson_id", authMiddleware, updateLessonController);
coursesRouter.delete("/:course_id/modules/:module_id/lessons/:lesson_id", authMiddleware, deleteLessonController);
coursesRouter.post("/:course_id/lessons/:lesson_id/complete", authMiddleware, markLessonCompleteController);
coursesRouter.put("/:course_id/modules/:module_id/lessons/:lesson_id/video", authMiddleware, setLessonVideoController);
coursesRouter.delete("/:course_id/modules/:module_id/lessons/:lesson_id/video", authMiddleware, removeLessonVideoController);
coursesRouter.post("/:course_id/modules/:module_id/lessons/:lesson_id/resources", authMiddleware, addLessonResourceController);
coursesRouter.delete("/:course_id/modules/:module_id/lessons/:lesson_id/resources/:resource_id", authMiddleware, removeLessonResourceController);

coursesRouter.get("/admin/all", authMiddleware, listCoursesForAdminController);

coursesRouter.patch("/:course_id/publish", authMiddleware, publishCourseController);
coursesRouter.patch("/:course_id/unpublish", authMiddleware, unpublishCourseController);
coursesRouter.get("/:course_id/faculty", authMiddleware, listCourseFacultyController);
coursesRouter.post("/:course_id/faculty", authMiddleware, assignCourseFacultyController);
coursesRouter.delete("/:course_id/faculty/:faculty_id", authMiddleware, removeCourseFacultyController);
coursesRouter.post("/", authMiddleware, createCourseController);

export default coursesRouter;