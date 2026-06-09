import {z} from "zod";

const envSchema = z.object({
    NODE_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),

    PORT: z
    .string()
    .default("3001"),

    DATABASE_URL: z
    .string({ required_error: "DATABASE_URL is required" })
    .min(1, "DATABASE_URL cannot be empty"),

    JWT_PRIVATE_KEY: z
    .string({ required_error: "JWT_PRIVATE_KEY is required" })
    .optional(),

    JWT_PUBLIC_KEY: z
    .string({ required_error: "JWT_PUBLIC_KEY is required" })
    .optional(),

    CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000"),
})

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (): Env => {
  const parsed = envSchema.safeParse(process.env);

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
};