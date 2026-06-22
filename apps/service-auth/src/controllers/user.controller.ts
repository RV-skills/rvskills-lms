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