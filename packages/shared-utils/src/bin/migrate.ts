/**
 * Runs `prisma migrate deploy` for one service, with DATABASE_URL
 * resolved the same way the service's own app code resolves it at
 * startup (see resolveDatabaseUrl). The plain `prisma migrate deploy`
 * CLI has no knowledge of that logic on its own.
 *
 * Also writes a real .env file at apps/<service>/.env before running
 * the migration: this project's prisma.config.ts files each load their
 * own local .env via dotenv.config() and read DATABASE_URL from it --
 * no .env is committed (correctly), so that file never exists in a
 * container otherwise, and prisma.config.ts's own datasource.url would
 * end up empty regardless of what this process's own env already has
 * set. Writing the file directly uses the exact mechanism the config
 * already expects, rather than relying on env-inheritance assumptions
 * across however Prisma's config loading actually works internally.
 *
 * Usage: node packages/shared-utils/dist/bin/migrate.js <service-name>
 * Run with CWD = /app (this project's container WORKDIR).
 */
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolveDatabaseUrl } from "../resolve-database-url";

const service = process.argv[2];

if (!service) {
  console.error("Usage: node migrate.js <service-name>");
  process.exit(1);
}

const databaseUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

writeFileSync(`apps/${service}/.env`, `DATABASE_URL=${databaseUrl}\n`);

execSync(
  `apps/${service}/node_modules/.bin/prisma migrate deploy --schema apps/${service}/prisma/schema.prisma`,
  { stdio: "inherit", env: process.env, cwd: "/app" }
);
