import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { enrollInCourseController } from "../../controllers/enrollments.controller";

const enrollmentsRouter: Router = Router();

enrollmentsRouter.post("/", authMiddleware, enrollInCourseController);

export default enrollmentsRouter;