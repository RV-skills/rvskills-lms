import { z } from 'zod';

export const RegisterSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be under 50 characters'),

  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be under 50 characters'),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be under 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),

  email: z
    .string()
    .email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be under 72 characters'),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
});

export const UpdateProfileSchema = z.object({
  first_name: z
    .string()
    .min(1)
    .max(50)
    .optional(),

  last_name: z
    .string()
    .min(1)
    .max(50)
    .optional(),

  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores')
    .optional(),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z
    .string()
    .min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;