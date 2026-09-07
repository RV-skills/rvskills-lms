import { UnauthorizedError } from "@rv-lms/shared-utils";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const PUBLIC_KEY = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n');

export interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string,
        tenant_id: string,
        roles: string[],
        permissions: string[]
    };
}

interface JWTPayload {
    user_id: string,
    tenant_id: string,
    roles: string[],
    permissions: string[]
}

export const authMiddleware = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        throw new UnauthorizedError("No token provided");
    }

    try {
        const payload = jwt.verify(token, PUBLIC_KEY, {
            algorithms: ['RS256'],
        }) as JWTPayload;

        req.user = {
            user_id: payload.user_id,
            tenant_id: payload.tenant_id,
            roles: payload.roles,
            permissions: payload.permissions
        };

        next();
    } catch (error) {
        throw new UnauthorizedError("Invalid or expired token");
    }
}