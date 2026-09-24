import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
  listAllUsers,
  listAllRoles,
  assignRoleToUser,
  removeRoleFromUser,
} from "../services/users.service";

export function meController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  res.status(200).json({
    success: true,
    data: req.user,
  });
}

export async function listAllUsersController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const users = await listAllUsers(req.accessToken!);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

export async function listAllRolesController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const roles = await listAllRoles(req.accessToken!);
    res.status(200).json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
}

export async function assignRoleController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user_id = req.params.user_id as string;
    const { role_id } = req.body as { role_id: string };
    await assignRoleToUser(user_id, role_id, req.accessToken!);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function removeRoleController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user_id = req.params.user_id as string;
    const role_id = req.params.role_id as string;
    await removeRoleFromUser(user_id, role_id, req.accessToken!);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}