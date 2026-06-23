import { Response, NextFunction } from "express"
import { AuthenticatedRequest } from "./auth.middleware"
import { ForbiddenError } from "@rv-lms/shared-utils";

export const requirePermission = (requiredPermission: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userPermissions = req.user?.permissions ?? [];

        if(!userPermissions.includes(requiredPermission)) {
            throw new ForbiddenError(
                `You do not have permission to perform this action: ${requiredPermission}`
            );
        }

        next();
    };
};