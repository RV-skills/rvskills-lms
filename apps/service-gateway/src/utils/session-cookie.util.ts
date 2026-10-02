import { Request, Response } from "express";

const SESSION_COOKIE_NAME = "session";

interface SessionPayload {
  accessToken: string;
  refreshToken: string;
}

// COOKIE_SECURE, when explicitly set, overrides the NODE_ENV-based
// default. A real production deployment should always set this to
// "true" (or leave it unset, since NODE_ENV=production already implies
// it) once served over HTTPS -- a browser silently refuses to store a
// Secure cookie over plain HTTP, which otherwise looks exactly like a
// real, successful login (the request itself returns 200/201) that
// mysteriously never actually logs the user in. Set explicitly to
// "false" for now, temporarily, until this deployment has a real
// domain and HTTPS -- revert once that exists.
function resolveSecureFlag(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function setSessionCookie(res: Response, payload: SessionPayload) {
  res.cookie(SESSION_COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure: resolveSecureFlag(),
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
