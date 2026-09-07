// apps/service-gateway/src/middlewares/public-route.middleware.ts
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { getSessionFromRequest, setSessionCookie, clearSessionCookie } from "../utils/session-cookie.util";
import { verifyAccessToken, refreshTokens } from "../services/auth.service";
import { BadGatewayError, GatewayTimeoutError } from "@rv-lms/shared-utils";

export const publicRouteMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const session = getSessionFromRequest(req);

  if (!session) {
    return next(); 
  }

  try {
    req.user = await verifyAccessToken(session.accessToken);
    req.accessToken = session.accessToken;
    return next();
  } catch (err) {
    if (err instanceof BadGatewayError || err instanceof GatewayTimeoutError) {
      return next();
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
  } catch {
    clearSessionCookie(res);
  }

  next();
};