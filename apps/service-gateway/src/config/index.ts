import dotenv from 'dotenv';
import { z } from 'zod';

function loadEnv() {
  dotenv.config();
  console.log('Environment variables loaded');
}

loadEnv();

const gatewayEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3001'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  SERVICE_AUTH_URL: z
    .string({ required_error: 'SERVICE_AUTH_URL is required' })
    .url(),
  SERVICE_COURSES_URL: z
    .string({ required_error: 'SERVICE_COURSES_URL is required' })
    .url(),
  SERVICE_ENROLLMENT_URL: z
    .string({ required_error: 'SERVICE_ENROLLMENT_URL is required' })
    .url(),
  COOKIE_SECRET: z
    .string({ required_error: 'COOKIE_SECRET is required' })
    .min(32, 'COOKIE_SECRET should be at least 32 characters'),
});

function validateEnv() {
  const parsed = gatewayEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error('------------------------------');
    parsed.error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
    console.error('------------------------------');
    console.error('Fix the above errors and restart the server.');
    process.exit(1);
  }

  return parsed.data;
}

export const serverConfig = validateEnv();
export type ServerConfig = typeof serverConfig;