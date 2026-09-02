import { Request, Response } from "express";

const SESSION_COOKIE_NAME = "session";

interface SessionPayload {
  accessToken: string;
  refreshToken: string;
}

export function setSessionCookie(res: Response, payload: SessionPayload) {
  res.cookie(SESSION_COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });
}

export function getSessionFromRequest(req: Request): SessionPayload | null {
  const raw = req.signedCookies[SESSION_COOKIE_NAME];
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME);
}