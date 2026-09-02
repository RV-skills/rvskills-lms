import { Request, Response, NextFunction } from "express";
import { register as registerService, logout as logoutService, login } from "../services/auth.service";
import { setSessionCookie, getSessionFromRequest, clearSessionCookie } from "../utils/session-cookie.util";


export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const tokens = await login(email, password);

    setSessionCookie(res, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: tokens.user,
    });
  } catch (err) {
    next(err);
  }
}


export async function registerController(req: Request, res: Response, next: NextFunction) {
  try {
    await registerService(req.body);
    res.status(201).json({ success: true, message: "Registration successful" });
  } catch (err) {
    next(err);
  }
}

export async function logoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const session = getSessionFromRequest(req);
    if (session) {
      await logoutService(session.refreshToken);
    }
    clearSessionCookie(res);
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (err) {
    clearSessionCookie(res);
    res.status(200).json({ success: true, message: "Logout successful" });
  }
}