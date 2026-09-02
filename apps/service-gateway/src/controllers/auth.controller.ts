import { Request, Response, NextFunction } from "express";
import { login } from "../services/auth.service";
import { setSessionCookie } from "../utils/session-cookie.util";

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const tokens = await login(email, password);

    setSessionCookie(res, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });

    // deliberately NOT sending tokens back in the response body \u2014 the whole
    // point of this architecture is that the browser never sees them
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: tokens.user,
    });
  } catch (err) {
    next(err);
  }
}