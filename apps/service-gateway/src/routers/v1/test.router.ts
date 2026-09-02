import { Router } from "express";
import { getSessionFromRequest, setSessionCookie } from "../../utils/session-cookie.util";

const testRouter: Router = Router();

if (process.env.NODE_ENV !== "production") {
  testRouter.post("/corrupt-access-token", (req, res) => {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(400).json({ success: false, message: "No session to corrupt" });
    }

    setSessionCookie(res, {
      accessToken: "deliberately-invalid-token",
      refreshToken: session.refreshToken,
    });

    res.status(200).json({ success: true, message: "Access token corrupted for testing" });
  });
}

export default testRouter;