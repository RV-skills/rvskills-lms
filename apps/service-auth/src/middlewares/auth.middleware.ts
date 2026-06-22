import { UnauthorizedError } from "@rv-lms/shared-utils";
import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";

export interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string,
        tenant_id: string,
        roles: string[],
        permissions: string[]
    };
}

export const authMiddleware = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.split(' ')[1];

    if(!token) {
        throw new UnauthorizedError("No token provided");
    }

    const payload = authService.verifyAccessToken(token);

    req.user = {
        user_id: payload.user_id,
        tenant_id: payload.tenant_id,
        roles: payload.roles,
        permissions: payload.permissions
    };

    next();
}