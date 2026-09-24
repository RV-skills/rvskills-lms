import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { enrollInCourseController, getMyEnrollmentsController } from "../../controllers/enrollments.controller";

const enrollmentsRouter: Router = Router();

enrollmentsRouter.get("/my-enrollments", authMiddleware, getMyEnrollmentsController);
enrollmentsRouter.post("/", authMiddleware, enrollInCourseController);

export default enrollmentsRouter;