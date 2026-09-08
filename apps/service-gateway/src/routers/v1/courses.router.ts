import { Router } from "express";
import { publicRouteMiddleware } from "../../middlewares/public-route.middleware";
import { listCoursesController, getCourseDetailController } from "../../controllers/courses.controller";
import { getCoursePlayerController } from "../../controllers/course-player.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const coursesRouter: Router = Router();

coursesRouter.get("/", publicRouteMiddleware, listCoursesController);
coursesRouter.get("/:course_id/player", authMiddleware, getCoursePlayerController);
coursesRouter.get("/:course_id", publicRouteMiddleware, getCourseDetailController);

export default coursesRouter;