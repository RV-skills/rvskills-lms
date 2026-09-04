import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware"
import { listCoursesController } from "../../controllers/courses.controller";

const coursesRouter: Router = Router();

coursesRouter.get("/", authMiddleware, listCoursesController);

export default coursesRouter;