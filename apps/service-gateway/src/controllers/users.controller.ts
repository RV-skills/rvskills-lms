import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
  listAllUsers,
  listAllRoles,
  assignRoleToUser,
  removeRoleFromUser,
  adminCreateUser,
  adminBatchCreateStudents,
  setUserStatus,
  resetUserPassword,
} from "../services/users.service";

export function meController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  res.status(200).json({
    success: true,
    data: req.user,
  });
}

export async function listAllUsersController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { search, role_id, status, page, pageSize, sortBy, sortOrder } = req.query as {
      search?: string;
      role_id?: string;
      status?: string;
      page?: string;
      pageSize?: string;
      sortBy?: string;
      sortOrder?: string;
    };
    const result = await listAllUsers(
      req.accessToken!,
      { search, role_id, status },
      {
        page: page ? parseInt(page, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        sortBy,
        sortOrder,
      }
    );
    res.status(200).json({ success: true, data: result.users, total: result.total });
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

export async function adminCreateUserController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await adminCreateUser(req.body, req.accessToken!);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function adminBatchCreateStudentsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { rows } = req.body as { rows: any[] };
    const result = await adminBatchCreateStudents(rows, req.accessToken!);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function setUserStatusController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user_id = req.params.user_id as string;
    const { status } = req.body as { status: "active" | "inactive" };
    const user = await setUserStatus(user_id, status, req.accessToken!);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function resetUserPasswordController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user_id = req.params.user_id as string;
    const result = await resetUserPassword(user_id, req.accessToken!);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}