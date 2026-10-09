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

export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
    ssl: { rejectUnauthorized: boolean } | false;
}


// SSL stays on unless DB_SSL is explicitly "false". RDS needs it; a local Postgres has no
// SSL set up, so only local .env files opt out. Defaulting to on means a missing setting
// can never silently drop SSL in production.
function resolveSsl(): { rejectUnauthorized: boolean } | false {
  return process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false };
}


/**
 * Same resolution as resolveDatabaseUrl(), but returns discrete fields
 * instead of a single connection-string URL. Use this for the app's
 * own runtime pg.Pool connections -- a real, AWS-generated RDS
 * password can contain characters (a literal ':' or '[', for example)
 * that remain genuinely awkward even once correctly percent-encoded
 * into a URL. This sidesteps URL parsing for the password entirely.
 *
 * Includes the same ssl: { rejectUnauthorized: false } every one of
 * this project's pg.Pool connections has always needed against RDS --
 * a real regression in the first version of this function, which
 * returned no ssl field at all, silently dropping SSL negotiation and
 * producing the exact same 'access denied' symptom as a genuine
 * credentials problem.
 *
 * Prisma's own CLI genuinely needs a URL string (prisma.config.ts has
 * no discrete-fields alternative), so resolveDatabaseUrl() above is
 * still what the migration script uses -- this is only for this
 * project's own application code.
 */
export function resolveDatabaseConnectionConfig(): DatabaseConnectionConfig {
  const ssl = resolveSsl();

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
      ssl,
    };
  }

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;

  if (!host || !user || !password || !database) {
    throw new Error(
      "No database connection configured: set either DATABASE_URL, or all of " +
        "DB_HOST/DB_USER/DB_PASSWORD/DB_NAME (DB_PORT is optional, defaults to 5432)."
    );
  }

  return { host, port, user, password, database, ssl };
}
