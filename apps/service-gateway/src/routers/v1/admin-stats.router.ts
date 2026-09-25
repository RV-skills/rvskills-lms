import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { getPlatformStatsController } from "../../controllers/admin-stats.controller";

const adminStatsRouter: Router = Router();

adminStatsRouter.get("/stats", authMiddleware, getPlatformStatsController);

export default adminStatsRouter;