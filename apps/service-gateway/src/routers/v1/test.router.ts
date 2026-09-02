import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { loginController } from "../../controllers/auth.controller"
import { getSessionFromRequest, setSessionCookie } from "../../utils/session-cookie.util";

const testRouter: Router = Router();

testRouter.get("/whoami", authMiddleware, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  res.status(200).json({
    success: true,
    message: "Gateway successfully verified your session",
    data: authReq.user,
  });
});

export default testRouter;