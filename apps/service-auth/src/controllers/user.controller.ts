import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { authService } from '../services/auth.service';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
} from '../validators/user.validator';
import { catchAsync } from '../utils/helpers/catch-async';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { ValidationError } from '@rv-lms/shared-utils';

export const register = catchAsync(async (req: Request, res: Response) => {
  const validatedData = RegisterSchema.parse(req.body);

  const user = await userService.register(validatedData);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: user,
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const validatedData = LoginSchema.parse(req.body);

  const authTokens = await authService.login(
    validatedData.email,
    validatedData.password
  );

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: authTokens,
  });
});

export const getProfile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.getProfile(req.user!.user_id)

  res.status(200).json({
    success: true,
    data: user
  })
})

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const validatedData = RefreshTokenSchema.parse(req.body);

  const authTokens = await authService.refreshAccessToken(
    validatedData.refresh_token
  );

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: authTokens,
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const validatedData = RefreshTokenSchema.parse(req.body);

  await authService.logout(validatedData.refresh_token);

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});


export const adminOnlyTest = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    success: true,
    message: "You have admin access"
  });
});

export const getUsersByIds = catchAsync(async (req: Request, res: Response) => {
  const idsParam = req.query.ids;

  if (typeof idsParam !== "string" || idsParam.trim() === "") {
    throw new ValidationError("Query parameter 'ids' is required (comma-separated)");
  }

  const user_ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);

  const users = await userService.getUsersByIds(user_ids);

  res.status(200).json({
    success: true,
    data: users,
  });
});

export const listUsers = catchAsync(async (req: Request, res: Response) => {
  const { search, role_id, status } = req.query as { search?: string; role_id?: string; status?: string };
  const users = await userService.listAllUsers({ search, role_id, status });
  res.status(200).json({ success: true, data: users });
});

export const listRoles = catchAsync(async (req: Request, res: Response) => {
  const roles = await userService.listAllRoles();
  res.status(200).json({ success: true, data: roles });
});

export const assignRole = catchAsync(async (req: Request, res: Response) => {
  const user_id = req.params.user_id as string;
  const { role_id } = req.body as { role_id: string };
  const user = await userService.assignRoleToUser(user_id, role_id);
  res.status(200).json({ success: true, data: user });
});

export const removeRole = catchAsync(async (req: Request, res: Response) => {
  const user_id = req.params.user_id as string;
  const role_id = req.params.role_id as string;
  const user = await userService.removeRoleFromUser(user_id, role_id);
  res.status(200).json({ success: true, data: user });
});

export const adminCreateUser = catchAsync(async (req: Request, res: Response) => {
  const { first_name, last_name, username, email, role_id } = req.body as {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    role_id: string;
  };
  const result = await userService.adminCreateUser({ first_name, last_name, username, email, role_id });
  res.status(201).json({ success: true, data: result });
});

export const adminBatchCreateStudents = catchAsync(async (req: Request, res: Response) => {
  const { rows } = req.body as {
    rows: { first_name: string; last_name: string; username: string; email: string }[];
  };
  const result = await userService.adminBatchCreateStudents(rows);
  res.status(201).json({ success: true, data: result });
});