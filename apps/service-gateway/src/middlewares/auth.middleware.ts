import { NextFunction, Request, Response } from "express";
import { BadGatewayError, GatewayTimeoutError, UnauthorizedError } from "@rv-lms/shared-utils";
import type { UserDTO } from "@rv-lms/shared-types";
import { getSessionFromRequest, setSessionCookie, clearSessionCookie } from "../utils/session-cookie.util";
import { verifyAccessToken, refreshTokens } from "../services/auth.service";

export interface AuthenticatedRequest extends Request {
  user?: UserDTO;
  accessToken?: string;
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const session = getSessionFromRequest(req);

  if (!session) {
    clearSessionCookie(res);
    return next(new UnauthorizedError("No session found"));
  }

  try {
    req.user = await verifyAccessToken(session.accessToken);
    req.accessToken = session.accessToken;
    return next();
  } catch (err) {
    
    if (err instanceof BadGatewayError || err instanceof GatewayTimeoutError) {
      return next(err);
    }
    
  }

  try {
    const newTokens = await refreshTokens(session.refreshToken);
    setSessionCookie(res, {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
    });
    req.user = newTokens.user;
    req.accessToken = newTokens.access_token;
    return next();
  } catch (err) {
    if (err instanceof BadGatewayError || err instanceof GatewayTimeoutError) {
      return next(err);
    }
    clearSessionCookie(res);
    return next(new UnauthorizedError("Session expired, please log in again"));
  }
};