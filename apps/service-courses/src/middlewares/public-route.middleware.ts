import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "./auth.middleware";

const PUBLIC_KEY = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n');

interface JWTPayload {
    user_id: string,
    tenant_id: string,
    roles: string[],
    permissions: string[]
}

export const publicRouteMiddleware = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(); 
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, PUBLIC_KEY, {
            algorithms: ['RS256'],
        }) as JWTPayload;

        req.user = {
            user_id: payload.user_id,
            tenant_id: payload.tenant_id,
            roles: payload.roles,
            permissions: payload.permissions,
        };
    } catch {
    }

    next();
};