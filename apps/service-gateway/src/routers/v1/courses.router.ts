import { Router } from "express";
import { publicRouteMiddleware } from "../../middlewares/public-route.middleware";
import {
  listCoursesController,
  getCourseDetailController,
  listCourseRatingsController,
  getAverageRatingController,
  submitRatingController,
  updateRatingController,
} from "../../controllers/courses.controller";
import { getCoursePlayerController } from "../../controllers/course-player.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const coursesRouter: Router = Router();

coursesRouter.get("/", publicRouteMiddleware, listCoursesController);
coursesRouter.get("/:course_id/player", authMiddleware, getCoursePlayerController);
coursesRouter.get("/:course_id/ratings", publicRouteMiddleware, listCourseRatingsController);
coursesRouter.get("/:course_id/ratings/average", publicRouteMiddleware, getAverageRatingController);
coursesRouter.post("/:course_id/ratings", authMiddleware, submitRatingController);
coursesRouter.patch("/:course_id/ratings", authMiddleware, updateRatingController);
coursesRouter.get("/:course_id", publicRouteMiddleware, getCourseDetailController);

export default coursesRouter;