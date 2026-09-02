import { Router } from "express";
import { loginController, registerController, logoutController } from "../../controllers/auth.controller";

const authRouter: Router = Router();

authRouter.post("/login", loginController);
authRouter.post("/register", registerController);
authRouter.post("/logout", logoutController);

export default authRouter;