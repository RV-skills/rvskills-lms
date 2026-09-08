import { Router } from "express";
import { publicRouteMiddleware } from "../../middlewares/public-route.middleware";
import { listCoursesController, getCourseDetailController } from "../../controllers/courses.controller";

const coursesRouter: Router = Router();

coursesRouter.get("/", publicRouteMiddleware, listCoursesController);
coursesRouter.get("/:course_id", publicRouteMiddleware, getCourseDetailController);

export default coursesRouter;