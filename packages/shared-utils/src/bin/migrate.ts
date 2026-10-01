/**
 * Runs `prisma migrate deploy` for one service, with DATABASE_URL
 * resolved the same way the service's own app code resolves it at
 * startup (see resolveDatabaseUrl). The plain `prisma migrate deploy`
 * CLI has no knowledge of that logic on its own.
 *
 * Also writes a real .env file at apps/<service>/.env before running
 * the migration: this project's prisma.config.ts files each load their
 * own local .env via dotenv.config(). Each prisma.config.ts now reads
 * its datasource URL via Prisma's own env() helper (lazy-evaluated at
 * the point Prisma actually needs it) rather than a raw process.env.X
 * reference captured eagerly at module-load time -- the real fix for
 * 'datasource.url property is required', found after confirming via
 * diagnostics that DATABASE_URL genuinely was set correctly in this
 * process and in the written .env file, yet Prisma still saw it as
 * empty under the old raw-reference pattern.
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
