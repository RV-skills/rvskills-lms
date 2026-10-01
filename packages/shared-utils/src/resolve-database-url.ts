/**
 * Resolves a Postgres connection string from the environment.
 *
 * Local development, and any environment with a single real
 * DATABASE_URL already set, keeps working exactly as before -- that
 * value is used as-is.
 *
 * In ECS, the real database password is managed directly by AWS
 * (RDS's manage_master_user_password), and Terraform is deliberately
 * never allowed to see it -- so no single DATABASE_URL can be built at
 * infrastructure-provisioning time. Instead, ECS injects the username
 * and password separately (each still pulled straight from the
 * AWS-managed secret, never visible to Terraform) alongside the
 * host/port/database name as plain environment variables, and this
 * function assembles the connection string here, at container startup,
 * the one place that is actually allowed to see the real credential.
 */
export function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME;
  const port = process.env.DB_PORT ?? "5432";

  if (!host || !user || !password || !name) {
    throw new Error(
      "No database connection configured: set either DATABASE_URL, or all of " +
        "DB_HOST/DB_USER/DB_PASSWORD/DB_NAME (DB_PORT is optional, defaults to 5432)."
    );
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(name)}`;
}
