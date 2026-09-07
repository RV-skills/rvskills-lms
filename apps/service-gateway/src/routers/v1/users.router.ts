import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { meController } from "../../controllers/users.controller";

const usersRouter: Router = Router();

usersRouter.get("/me", authMiddleware, meController);

export default usersRouter;