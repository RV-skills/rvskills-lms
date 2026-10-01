/**
 * Runs `prisma migrate deploy` for one service, with DATABASE_URL
 * resolved the same way the service's own app code resolves it at
 * startup (see resolveDatabaseUrl). The plain `prisma migrate deploy`
 * CLI has no knowledge of that logic on its own -- it only looks for
 * DATABASE_URL directly -- so a one-off ECS task running the CLI
 * command alone would never see a real connection string.
 *
 * Usage: node packages/shared-utils/dist/bin/migrate.js <service-name>
 * Run with CWD = /app (this project's container WORKDIR).
 */
import { execSync } from "child_process";
import { resolveDatabaseUrl } from "../resolve-database-url";

const service = process.argv[2];

if (!service) {
  console.error("Usage: node migrate.js <service-name>");
  process.exit(1);
}

process.env.DATABASE_URL = resolveDatabaseUrl();

execSync(
  `apps/${service}/node_modules/.bin/prisma migrate deploy --schema apps/${service}/prisma/schema.prisma`,
  { stdio: "inherit", env: process.env, cwd: "/app" }
);
