import { Router } from "express";
import { publicRouteMiddleware } from "../../middlewares/public-route.middleware";
import { listCoursesController } from "../../controllers/courses.controller";

const coursesRouter: Router = Router();

coursesRouter.get("/", publicRouteMiddleware, listCoursesController);

export default coursesRouter;