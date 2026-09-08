import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { getMyLearningController } from "../../controllers/dashboard.controller";

const dashboardRouter: Router = Router();

dashboardRouter.get("/my-learning", authMiddleware, getMyLearningController);

export default dashboardRouter;